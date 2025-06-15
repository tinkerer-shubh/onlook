'use client';

import { useUserManager } from '@/components/store/user';
import { ErrorDisplay, parseGitHubError } from '@/components/github/ErrorDisplay';
import { showGitHubErrorToast, showGitHubSuccessToast } from '@/components/github/ErrorToast';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Checkbox } from '@onlook/ui/checkbox';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Skeleton } from '@onlook/ui/skeleton';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    fork: boolean;
    html_url: string;
}

const GitHubRepositoriesPage = observer(() => {
    const userManager = useUserManager();
    const router = useRouter();
    const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
    const [filteredRepos, setFilteredRepos] = useState<GitHubRepository[]>([]);
    const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userManager.user) {
            toast.error('Please sign in first');
            router.push('/login');
            return;
        }
        fetchRepositories();
    }, [userManager.user, router]);

    useEffect(() => {
        const filtered = repositories.filter(repo =>
            repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredRepos(filtered);
    }, [repositories, searchQuery]);

    const fetchRepositories = async () => {
        if (!userManager.user?.id) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/github-list-repos?user_id=${userManager.user.id}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    setError('GitHub account not connected. Please connect your GitHub account first.');
                    return;
                }
                throw new Error(`Failed to fetch repositories: ${response.statusText}`);
            }

            const repos = await response.json();
            setRepositories(repos);
        } catch (err) {
            console.error('Failed to fetch repositories:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repositories';
            setError(errorMessage);
            showGitHubErrorToast(err, 'Failed to fetch repositories');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRepoToggle = (repoId: number) => {
        const newSelected = new Set(selectedRepos);
        if (newSelected.has(repoId)) {
            newSelected.delete(repoId);
        } else {
            newSelected.add(repoId);
        }
        setSelectedRepos(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedRepos.size === filteredRepos.length) {
            setSelectedRepos(new Set());
        } else {
            setSelectedRepos(new Set(filteredRepos.map(repo => repo.id)));
        }
    };

    const handleImportSelected = async () => {
        if (selectedRepos.size === 0) {
            toast.error('Please select at least one repository to import');
            return;
        }

        if (!userManager.user?.id) {
            toast.error('User not authenticated');
            return;
        }

        setIsImporting(true);

        try {
            const selectedRepoData = repositories.filter(repo => selectedRepos.has(repo.id));
            const importPromises = selectedRepoData.map(async (repo) => {
                const response = await fetch('/api/github-import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: userManager.user!.id,
                        repo: repo.full_name,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to import ${repo.name}: ${response.statusText}`);
                }

                return response.json();
            });

            const results = await Promise.all(importPromises);
            
            const operationIds = results.map(result => result.operation_id);
            router.push(`/import/github/progress?operations=${operationIds.join(',')}`);
            
        } catch (err) {
            console.error('Failed to import repositories:', err);
            showGitHubErrorToast(err, 'Failed to import repositories');
        } finally {
            setIsImporting(false);
        }
    };

    const handleBackToConnection = () => {
        router.push('/import/github');
    };

    if (error) {
        const gitHubError = parseGitHubError(error);
        return (
            <div className="container mx-auto max-w-4xl py-8">
                <ErrorDisplay
                    error={gitHubError}
                    onRetry={fetchRepositories}
                    onBack={handleBackToConnection}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-6xl py-8">
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <Button onClick={handleBackToConnection} variant="ghost" size="sm">
                        <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Select Repositories</h1>
                        <p className="text-muted-foreground">
                            Choose the repositories you want to import into Onlook
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search repositories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    {!isLoading && filteredRepos.length > 0 && (
                        <Button
                            onClick={handleSelectAll}
                            variant="outline"
                            size="sm"
                        >
                            {selectedRepos.size === filteredRepos.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-4">
                                    <Skeleton className="h-4 w-4" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-3 w-[200px]" />
                                    </div>
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredRepos.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-8">
                        <Icons.GitHubLogo className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No repositories found</h3>
                        <p className="text-muted-foreground">
                            {searchQuery ? 'No repositories match your search.' : 'No repositories available to import.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="space-y-3 mb-6">
                        {filteredRepos.map((repo) => (
                            <Card key={repo.id} className="hover:bg-muted/50 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-center space-x-4">
                                        <Checkbox
                                            checked={selectedRepos.has(repo.id)}
                                            onCheckedChange={() => handleRepoToggle(repo.id)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-medium truncate">{repo.name}</h3>
                                                <div className="flex items-center gap-1">
                                                    {repo.private && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                            <Icons.LockClosed className="w-3 h-3 mr-1" />
                                                            Private
                                                        </span>
                                                    )}
                                                    {repo.fork && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                            Fork
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {repo.full_name}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                        >
                                            <a
                                                href={repo.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Icons.ExternalLink className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {selectedRepos.size > 0 && (
                        <div className="sticky bottom-4 bg-background border rounded-lg p-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">
                                        {selectedRepos.size} repository{selectedRepos.size !== 1 ? 'ies' : ''} selected
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Ready to import into Onlook
                                    </p>
                                </div>
                                <Button
                                    onClick={handleImportSelected}
                                    disabled={isImporting}
                                    size="lg"
                                >
                                    {isImporting ? (
                                        <>
                                            <Icons.Shadow className="mr-2 h-4 w-4 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            Import Selected
                                            <Icons.ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

export default GitHubRepositoriesPage;
