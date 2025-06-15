'use client';

import { useUserManager } from '@/components/store/user';
import { ErrorDisplay, parseGitHubError } from '@/components/github/ErrorDisplay';
import { showGitHubErrorToast, showGitHubSuccessToast } from '@/components/github/ErrorToast';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const GitHubImportPage = observer(() => {
    const userManager = useUserManager();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    useEffect(() => {
        if (connected === '1') {
            setIsConnected(true);
            setConnectionError(null);
            setIsCheckingStatus(false);
            showGitHubSuccessToast('Successfully connected to GitHub!', 'You can now browse and import your repositories');
        } else if (error) {
            setConnectionError(error);
            setIsCheckingStatus(false);
            showGitHubErrorToast(error, 'GitHub connection failed');
        } else if (userManager.user) {
            // Check existing connection status
            checkConnectionStatus();
        } else {
            // No user authenticated, stop checking and show connect button
            setIsCheckingStatus(false);
            setIsConnected(false);
        }
    }, [connected, error, userManager.user]);

    const checkConnectionStatus = async () => {
        if (!userManager.user?.id) return;

        setIsCheckingStatus(true);
        try {
            const response = await fetch(`/api/github-connection-status?user_id=${userManager.user.id}`);
            const data = await response.json();
            
            if (response.ok && data.connected) {
                setIsConnected(true);
                setConnectionError(null);
            } else {
                setIsConnected(false);
                if (data.error && data.error !== 'GitHub account not connected') {
                    setConnectionError(data.error);
                }
            }
        } catch (err) {
            console.error('Failed to check connection status:', err);
            // Don't set error for connection check failures
        } finally {
            setIsCheckingStatus(false);
        }
    };

    const handleConnectGitHub = async () => {
        if (!userManager.user) {
            // For demo purposes, show error about authentication
            setConnectionError('Authentication required. Please sign in to connect GitHub.');
            return;
        }

        setIsConnecting(true);
        try {
            // Redirect to backend OAuth endpoint with user ID
            const authorizeUrl = `/api/github-authorize?user_id=${encodeURIComponent(userManager.user.id)}`;
            window.location.href = authorizeUrl;
        } catch (err) {
            console.error('Failed to initiate GitHub connection:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect to GitHub';
            setConnectionError(errorMessage);
            showGitHubErrorToast(err, 'Failed to connect to GitHub');
            setIsConnecting(false);
        }
    };

    const handleContinue = () => {
        // Navigate to repository selection
        router.push('/import/github/repositories');
    };

    const handleRetryConnection = () => {
        setConnectionError(null);
        handleConnectGitHub();
    };

    const handleBackToProjects = () => {
        router.push('/projects');
    };

    const handleDisconnectGitHub = async () => {
        if (!userManager.user?.id) return;

        setIsDisconnecting(true);
        try {
            const response = await fetch('/api/github-disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userManager.user.id,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setIsConnected(false);
                setConnectionError(null);
                showGitHubSuccessToast('GitHub account disconnected', 'You can reconnect anytime');
            } else {
                throw new Error(data.error || 'Failed to disconnect GitHub account');
            }
        } catch (err) {
            console.error('Failed to disconnect GitHub:', err);
            showGitHubErrorToast(err, 'Failed to disconnect GitHub account');
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Show error state if there's a connection error
    if (connectionError) {
        const gitHubError = parseGitHubError(connectionError);
        return (
            <div className="container mx-auto max-w-2xl py-8">
                <ErrorDisplay
                    error={gitHubError}
                    onRetry={handleRetryConnection}
                    onBack={handleBackToProjects}
                />
            </div>
        );
    }

    if (isCheckingStatus) {
        return (
            <div className="container mx-auto max-w-2xl py-8">
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                            <Icons.Shadow className="h-6 w-6 animate-spin" />
                        </div>
                        <CardTitle>Checking GitHub Connection</CardTitle>
                        <CardDescription>
                            Please wait while we check your GitHub connection status...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (isConnected) {
        return (
            <div className="container mx-auto max-w-2xl py-8">
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                            <Icons.CheckCircled className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle>GitHub Connected Successfully!</CardTitle>
                        <CardDescription>
                            Your GitHub account is now connected. You can now browse and import your repositories.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={handleContinue} className="w-full">
                            Browse Repositories
                            <Icons.ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button 
                            onClick={handleDisconnectGitHub} 
                            disabled={isDisconnecting}
                            variant="outline" 
                            className="w-full"
                        >
                            {isDisconnecting ? (
                                <>
                                    <Icons.Shadow className="mr-2 h-4 w-4 animate-spin" />
                                    Disconnecting...
                                </>
                            ) : (
                                <>
                                    <Icons.ExternalLink className="mr-2 h-4 w-4" />
                                    Disconnect GitHub
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl py-8">
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <Icons.GitHubLogo className="h-6 w-6" />
                    </div>
                    <CardTitle>Import from GitHub</CardTitle>
                    <CardDescription>
                        Connect your GitHub account to import repositories into Onlook. 
                        You'll be able to access both public and private repositories.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border p-4">
                        <h3 className="font-medium mb-2">What you'll get:</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <Icons.CheckCircled className="h-4 w-4 text-green-500" />
                                Access to all your repositories
                            </li>
                            <li className="flex items-center gap-2">
                                <Icons.CheckCircled className="h-4 w-4 text-green-500" />
                                Import public and private repos
                            </li>
                            <li className="flex items-center gap-2">
                                <Icons.CheckCircled className="h-4 w-4 text-green-500" />
                                Secure token storage
                            </li>
                        </ul>
                    </div>
                    
                    <Button 
                        onClick={handleConnectGitHub} 
                        disabled={isConnecting}
                        className="w-full"
                        size="lg"
                    >
                        {isConnecting ? (
                            <>
                                <Icons.Shadow className="mr-2 h-4 w-4 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Icons.GitHubLogo className="mr-2 h-4 w-4" />
                                Connect GitHub Account
                            </>
                        )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                        By connecting, you agree to grant Onlook access to your GitHub repositories. 
                        You can revoke this access at any time from your GitHub settings.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
});

export default GitHubImportPage; 