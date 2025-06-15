'use client';

import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { type ReactNode } from 'react';

export interface GitHubError {
    type: 'connection' | 'authentication' | 'repository' | 'import' | 'network' | 'unknown';
    message: string;
    details?: string;
    code?: string;
    retryable?: boolean;
}

interface ErrorDisplayProps {
    error: GitHubError;
    onRetry?: () => void;
    onBack?: () => void;
    onSupport?: () => void;
    className?: string;
}

export function ErrorDisplay({ error, onRetry, onBack, onSupport, className }: ErrorDisplayProps) {
    const getErrorIcon = (type: GitHubError['type']) => {
        switch (type) {
            case 'connection':
                return <Icons.Globe className="h-6 w-6 text-red-600 dark:text-red-400" />;
            case 'authentication':
                return <Icons.LockClosed className="h-6 w-6 text-red-600 dark:text-red-400" />;
            case 'repository':
                return <Icons.GitHubLogo className="h-6 w-6 text-red-600 dark:text-red-400" />;
            case 'import':
                return <Icons.Download className="h-6 w-6 text-red-600 dark:text-red-400" />;
            case 'network':
                return <Icons.Globe className="h-6 w-6 text-red-600 dark:text-red-400" />;
            default:
                return <Icons.ExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />;
        }
    };

    const getErrorTitle = (type: GitHubError['type']) => {
        switch (type) {
            case 'connection':
                return 'Connection Failed';
            case 'authentication':
                return 'Authentication Error';
            case 'repository':
                return 'Repository Error';
            case 'import':
                return 'Import Failed';
            case 'network':
                return 'Network Error';
            default:
                return 'Something Went Wrong';
        }
    };

    const getSuggestions = (type: GitHubError['type']): ReactNode => {
        switch (type) {
            case 'connection':
                return (
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Check your internet connection</li>
                        <li>• Verify GitHub is accessible</li>
                        <li>• Try refreshing the page</li>
                    </ul>
                );
            case 'authentication':
                return (
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Your GitHub session may have expired</li>
                        <li>• Try reconnecting your GitHub account</li>
                        <li>• Check if you revoked access in GitHub settings</li>
                    </ul>
                );
            case 'repository':
                return (
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Repository may be private or deleted</li>
                        <li>• Check repository permissions</li>
                        <li>• Verify the repository still exists</li>
                    </ul>
                );
            case 'import':
                return (
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Repository may be too large</li>
                        <li>• Check for unsupported file types</li>
                        <li>• Try importing fewer repositories at once</li>
                    </ul>
                );
            case 'network':
                return (
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Check your internet connection</li>
                        <li>• Try again in a few moments</li>
                        <li>• Contact support if the issue persists</li>
                    </ul>
                );
            default:
                return (
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Try refreshing the page</li>
                        <li>• Check your internet connection</li>
                        <li>• Contact support if the issue persists</li>
                    </ul>
                );
        }
    };

    const handleCopyError = () => {
        const errorInfo = {
            type: error.type,
            message: error.message,
            details: error.details,
            code: error.code,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
        };
        
        navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
        toast.success('Error details copied to clipboard');
    };

    return (
        <Card className={className}>
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                    {getErrorIcon(error.type)}
                </div>
                <CardTitle>{getErrorTitle(error.type)}</CardTitle>
                <CardDescription>{error.message}</CardDescription>
                {error.details && (
                    <div className="mt-2 p-3 bg-muted rounded-md text-left">
                        <p className="text-sm font-medium mb-1">Details:</p>
                        <p className="text-sm text-muted-foreground">{error.details}</p>
                        {error.code && (
                            <p className="text-xs text-muted-foreground mt-1">Error Code: {error.code}</p>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2">Suggestions:</h3>
                    {getSuggestions(error.type)}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                    {error.retryable && onRetry && (
                        <Button onClick={onRetry} className="flex-1">
                            <Icons.Reload className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                    )}
                    {onBack && (
                        <Button onClick={onBack} variant="outline" className="flex-1">
                            <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                            Go Back
                        </Button>
                    )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    <Button onClick={handleCopyError} variant="ghost" size="sm" className="flex-1">
                        <Icons.Copy className="mr-2 h-4 w-4" />
                        Copy Error Details
                    </Button>
                    {onSupport && (
                        <Button onClick={onSupport} variant="ghost" size="sm" className="flex-1">
                            <Icons.ChatBubble className="mr-2 h-4 w-4" />
                            Contact Support
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Helper function to parse and categorize errors
export function parseGitHubError(error: unknown): GitHubError {
    if (typeof error === 'string') {
        return categorizeError(error);
    }
    
    if (error instanceof Error) {
        return categorizeError(error.message, error.name);
    }
    
    if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        return categorizeError(
            errorObj.message || 'Unknown error occurred',
            errorObj.code || errorObj.name,
            errorObj.details
        );
    }
    
    return {
        type: 'unknown',
        message: 'An unexpected error occurred',
        retryable: true,
    };
}

function categorizeError(message: string, code?: string, details?: string): GitHubError {
    const lowerMessage = message.toLowerCase();
    
    // Authentication errors
    if (lowerMessage.includes('unauthorized') || 
        lowerMessage.includes('authentication') ||
        lowerMessage.includes('token') ||
        lowerMessage.includes('401') ||
        code === 'UNAUTHORIZED') {
        return {
            type: 'authentication',
            message: 'GitHub authentication failed',
            details: message,
            code,
            retryable: true,
        };
    }
    
    // Connection errors
    if (lowerMessage.includes('network') ||
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('fetch') ||
        code === 'NETWORK_ERROR') {
        return {
            type: 'connection',
            message: 'Failed to connect to GitHub',
            details: message,
            code,
            retryable: true,
        };
    }
    
    // Repository errors
    if (lowerMessage.includes('repository') ||
        lowerMessage.includes('repo') ||
        lowerMessage.includes('not found') ||
        lowerMessage.includes('404') ||
        code === 'NOT_FOUND') {
        return {
            type: 'repository',
            message: 'Repository access error',
            details: message,
            code,
            retryable: false,
        };
    }
    
    // Import specific errors
    if (lowerMessage.includes('import') ||
        lowerMessage.includes('clone') ||
        lowerMessage.includes('download') ||
        code === 'IMPORT_ERROR') {
        return {
            type: 'import',
            message: 'Failed to import repository',
            details: message,
            code,
            retryable: true,
        };
    }
    
    // Network errors
    if (lowerMessage.includes('network') ||
        lowerMessage.includes('offline') ||
        lowerMessage.includes('dns') ||
        code === 'NETWORK_ERROR') {
        return {
            type: 'network',
            message: 'Network connection error',
            details: message,
            code,
            retryable: true,
        };
    }
    
    // Default to unknown error
    return {
        type: 'unknown',
        message: message || 'An unexpected error occurred',
        details,
        code,
        retryable: true,
    };
} 