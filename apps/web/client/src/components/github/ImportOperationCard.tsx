'use client';

import { Card, CardContent } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { Progress } from '@onlook/ui/progress';
import { Button } from '@onlook/ui/button';
import { toast } from '@onlook/ui/sonner';
import { ErrorDisplay, parseGitHubError, type GitHubError } from './ErrorDisplay';
import { useState } from 'react';

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

interface ImportOperationCardProps {
    operation: ImportOperation;
    onRetry?: (operationId: string, repository: string) => Promise<void>;
}

export function ImportOperationCard({ operation, onRetry }: ImportOperationCardProps) {
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

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

    const handleRetry = async () => {
        if (!onRetry) return;
        
        setIsRetrying(true);
        try {
            await onRetry(operation.id, operation.repository);
            toast.success(`Retrying import for ${operation.repository}`);
        } catch (err) {
            console.error('Failed to retry import:', err);
            toast.error(`Failed to retry import for ${operation.repository}`);
        } finally {
            setIsRetrying(false);
        }
    };

    const handleCopyError = () => {
        const errorInfo = {
            repository: operation.repository,
            operationId: operation.id,
            error: operation.error,
            status: operation.status,
            timestamp: new Date().toISOString(),
        };
        
        navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
        toast.success('Error details copied to clipboard');
    };

    return (
        <Card>
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
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-red-600">
                                        {operation.error || 'Import failed'}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => setShowErrorDetails(!showErrorDetails)}
                                            variant="ghost"
                                            size="sm"
                                        >
                                            <Icons.InfoCircled className="mr-1 h-3 w-3" />
                                            {showErrorDetails ? 'Hide' : 'Details'}
                                        </Button>
                                        {onRetry && (
                                            <Button
                                                onClick={handleRetry}
                                                disabled={isRetrying}
                                                variant="outline"
                                                size="sm"
                                            >
                                                {isRetrying ? (
                                                    <Icons.Shadow className="mr-1 h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Icons.Reload className="mr-1 h-3 w-3" />
                                                )}
                                                Retry
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                
                                {showErrorDetails && operation.error && (
                                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                                                Error Details
                                            </h4>
                                            <Button
                                                onClick={handleCopyError}
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-red-600 hover:text-red-700"
                                            >
                                                <Icons.Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <p className="text-sm text-red-700 dark:text-red-300 font-mono">
                                            {operation.error}
                                        </p>
                                        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                                            Operation ID: {operation.id}
                                        </div>
                                    </div>
                                )}
                            </div>
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
    );
} 