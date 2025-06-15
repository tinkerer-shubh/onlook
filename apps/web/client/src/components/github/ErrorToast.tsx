'use client';

import { toast } from '@onlook/ui/sonner';
import { parseGitHubError, type GitHubError } from './ErrorDisplay';

export function showGitHubErrorToast(error: unknown, context?: string) {
    const gitHubError = parseGitHubError(error);
    
    const title = context ? `${context}: ${gitHubError.message}` : gitHubError.message;
    
    // Show different toast types based on error severity
    switch (gitHubError.type) {
        case 'authentication':
            toast.error(title, {
                description: 'Please reconnect your GitHub account',
                action: {
                    label: 'Reconnect',
                    onClick: () => {
                        window.location.href = '/import/github';
                    },
                },
                duration: 8000,
            });
            break;
            
        case 'connection':
        case 'network':
            toast.error(title, {
                description: 'Check your internet connection and try again',
                action: {
                    label: 'Retry',
                    onClick: () => {
                        window.location.reload();
                    },
                },
                duration: 6000,
            });
            break;
            
        case 'repository':
            toast.error(title, {
                description: 'Repository may be private or deleted',
                duration: 6000,
            });
            break;
            
        case 'import':
            toast.error(title, {
                description: 'Try importing fewer repositories at once',
                duration: 6000,
            });
            break;
            
        default:
            toast.error(title, {
                description: gitHubError.details || 'Please try again or contact support',
                duration: 5000,
            });
    }
}

export function showGitHubSuccessToast(message: string, description?: string) {
    toast.success(message, {
        description,
        duration: 4000,
    });
}

export function showGitHubInfoToast(message: string, description?: string) {
    toast.info(message, {
        description,
        duration: 4000,
    });
} 