'use client';

import { useUserManager } from '@/components/store/user';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { Progress } from '@onlook/ui/progress';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ImportOperation {
    id: string;
    repository: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    progress: number;
    message?: string;
    error?: string;
    startedAt?: string;
    completedAt?: string;
}

const GitHubImportProgressPage = observer(() => {
    const userManager = useUserManager();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [operations, setOperations] = useState<ImportOperation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const operationIds = searchParams.get('operations')?.split(',') || [];

    useEffect(() => {
        if (!userManager.user) {
            toast.error('Please sign in first');
            router.push('/login');
            return;
        }

        if (operationIds.length === 0) {
            setError('No import operations specified');
            setIsLoading(false);
            return;
        }

        fetchImportStatus();
        
        // Poll for updates every 2 seconds
        const interval = setInterval(fetchImportStatus, 2000);
        
        return () => clearInterval(interval);
    }, [userManager.user, router, operationIds]);

    const fetchImportStatus = async () => {
        if (!userManager.user?.id || operationIds.length === 0) return;

        try {
            const statusPromises = operationIds.map(async (operationId) => {
                const response = await fetch(`/api/github-import-status?id=${operationId}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch status for operation ${operationId}`);
                }
                
                return response.json();
            });

            const results = await Promise.all(statusPromises);
            setOperations(results);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch import status:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch import status');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: ImportOperation['status']) => {
        switch (status) {
            case 'pending':
                return <Icons.CounterClockwiseClock className="h-4 w-4 text-yellow-500" />;
            case 'in-progress':
                return <Icons.Shadow className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'completed':
                return <Icons.CheckCircled className="h-4 w-4 text-green-500" />;
            case 'failed':
                return <Icons.ExclamationTriangle className="h-4 w-4 text-red-500" />;
            default:
                return <Icons.CounterClockwiseClock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: ImportOperation['status']) => {
        switch (status) {
            case 'pending':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'in-progress':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'completed':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'failed':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const allCompleted = operations.length > 0 && operations.every(op => op.status === 'completed' || op.status === 'failed');
    const hasFailures = operations.some(op => op.status === 'failed');
    const completedCount = operations.filter(op => op.status === 'completed').length;

    const handleBackToRepositories = () => {
        router.push('/import/github/repositories');
    };

    const handleGoToProjects = () => {
        router.push('/projects');
    };

    const handleRetryFailed = async () => {
        const failedOperations = operations.filter(op => op.status === 'failed');
        
        if (failedOperations.length === 0) return;

        toast.info('Retrying failed imports...');
        
        try {
            const retryPromises = failedOperations.map(async (op) => {
                const response = await fetch('/api/github-import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: userManager.user!.id,
                        repo: op.repository,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to retry import for ${op.repository}`);
                }

                return response.json();
            });

            const results = await Promise.all(retryPromises);
            
            // Update URL with new operation IDs
            const newOperationIds = [...operationIds.filter(id => !failedOperations.find(op => op.id === id)), ...results.map(r => r.operation_id)];
            router.replace(`/import/github/progress?operations=${newOperationIds.join(',')}`);
            
        } catch (err) {
            console.error('Failed to retry imports:', err);
            toast.error('Failed to retry some imports');
        }
    };

    if (error) {
        return (
            <div className="container mx-auto max-w-4xl py-8">
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                            <Icons.ExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle>Import Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button onClick={handleBackToRepositories} variant="outline">
                            <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Repositories
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-8">
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <Button onClick={handleBackToRepositories} variant="ghost" size="sm">
                        <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Import Progress</h1>
                        <p className="text-muted-foreground">
                            {isLoading ? 'Loading import status...' : 
                             allCompleted ? 'Import process completed' : 
                             'Importing your repositories into Onlook'}
                        </p>
                    </div>
                </div>

                {!isLoading && operations.length > 0 && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{completedCount} of {operations.length} completed</span>
                        {hasFailures && (
                            <span className="text-red-600">
                                {operations.filter(op => op.status === 'failed').length} failed
                            </span>
                        )}
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: operationIds.length }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="flex items-center space-x-4">
                                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                                        <div className="h-2 bg-gray-200 rounded w-full animate-pulse" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <>
                    <div className="space-y-4 mb-6">
                        {operations.map((operation) => (
                            <Card key={operation.id}>
                                <CardContent className="p-6">
                                    <div className="flex items-start space-x-4">
                                        <div className="mt-1">
                                            {getStatusIcon(operation.status)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-medium truncate">{operation.repository}</h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(operation.status)}`}>
                                                    {operation.status.replace('-', ' ')}
                                                </span>
                                            </div>
                                            
                                            {operation.status === 'in-progress' && (
                                                <div className="space-y-2">
                                                    <Progress value={operation.progress} className="h-2" />
                                                    <p className="text-sm text-muted-foreground">
                                                        {operation.message || `${operation.progress}% complete`}
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {operation.status === 'completed' && (
                                                <p className="text-sm text-green-600">
                                                    Successfully imported • {operation.completedAt && new Date(operation.completedAt).toLocaleTimeString()}
                                                </p>
                                            )}
                                            
                                            {operation.status === 'failed' && (
                                                <p className="text-sm text-red-600">
                                                    {operation.error || 'Import failed'}
                                                </p>
                                            )}
                                            
                                            {operation.status === 'pending' && (
                                                <p className="text-sm text-yellow-600">
                                                    Waiting to start...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {allCompleted && (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                                    <Icons.CheckCircled className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-lg font-medium mb-2">
                                    {hasFailures ? 'Import Completed with Issues' : 'All Imports Completed!'}
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    {hasFailures 
                                        ? `${completedCount} repositories imported successfully. ${operations.filter(op => op.status === 'failed').length} failed.`
                                        : `Successfully imported ${completedCount} repositories into your Onlook workspace.`
                                    }
                                </p>
                                <div className="flex gap-2 justify-center">
                                    {hasFailures && (
                                                                <Button onClick={handleRetryFailed} variant="outline">
                            <Icons.Reload className="mr-2 h-4 w-4" />
                            Retry Failed
                        </Button>
                                    )}
                                    <Button onClick={handleGoToProjects}>
                                        View Projects
                                        <Icons.ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
});

export default GitHubImportProgressPage;
