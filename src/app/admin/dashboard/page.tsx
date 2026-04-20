"use client";

import { useEffect, useState } from "react";
import { ArrowPathIcon, CircleStackIcon, SignalIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface SystemStatus {
    success: boolean;
    status: {
        isRunning: boolean;
        version: string;
        memoryUsage: number | null;
        pid: number | null;
    };
    config: {
        exists: boolean;
        modified: string | null;
    };
    users: {
        count: number;
        proxyauthSize: number;
        proxyauthModified: string | null;
    };
    logs: {
        size: number;
        fileCount: number;
    };
    trafficSync?: {
        lastSync: string | null;
        updatedCount: number;
    };
    timestamp: string;
}

interface UserSummary {
    total: number;
    active: number;
    inactive: number;
    withDataLimit: number;
}

export default function DashboardPage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const router = useRouter();
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [trafficStats, setTrafficStats] = useState<{
        totalSent: number;
        totalReceived: number;
        totalRequests: number;
    } | null>(null);

    const fetchSystemStatus = async () => {
        try {
            const response = await fetch("/api/system/status");
            const data = await response.json();

            if (data.success) {
                setSystemStatus(data);
            }
        } catch (err) {
            console.error("Failed to fetch system status:", err);
        }
    };

    const fetchUserSummary = async () => {
        try {
            const response = await fetch("/api/admin/users?stats=true");
            const data = await response.json();

            if (data.success) {
                setUserSummary(data.stats);
            }
        } catch (err) {
            console.error("Failed to fetch user summary:", err);
        }
    };

    const fetchTrafficStats = async () => {
        try {
            const response = await fetch("/api/logs?limit=50000");
            const data = await response.json();

            if (data.success && data.logs) {
                const userMap = new Map<
                    string,
                    {
                        requests: number;
                        sent: number;
                        received: number;
                    }
                >();

                for (const log of data.logs) {
                    const username = log.auth.user || "anonymous";

                    // Aggregate by user (for total stats)
                    if (username !== "anonymous" && username !== "-") {
                        const current = userMap.get(username) || {
                            requests: 0,
                            sent: 0,
                            received: 0
                        };

                        userMap.set(username, {
                            requests: current.requests + 1,
                            sent: current.sent + log.bytes.sent,
                            received: current.received + log.bytes.received
                        });
                    }
                }

                // Calculate total stats from userMap
                const totalSent = Array.from(userMap.values()).reduce((sum, u) => sum + u.sent, 0);
                const totalReceived = Array.from(userMap.values()).reduce((sum, u) => sum + u.received, 0);
                const totalRequests = Array.from(userMap.values()).reduce((sum, u) => sum + u.requests, 0);

                setTrafficStats({
                    totalSent,
                    totalReceived,
                    totalRequests
                });
            }
        } catch (error) {
            console.error("Failed to fetch traffic stats:", error);
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([fetchSystemStatus(), fetchUserSummary(), fetchTrafficStats()]);
        } catch {
            setError("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAllData();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchAllData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchAllData, 30000);

        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const formatRelativeTime = (dateString: string | null): string => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;

        return `${days}d ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                    onClick={fetchAllData}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 flex flex-col gap-8 mb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="mt-2 text-base text-gray-500 dark:text-gray-400">3proxy management overview</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50 ${refreshing ? "animate-spin" : ""}`}
                        disabled={refreshing}
                        onClick={handleRefresh}
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                    </button>
                </div>
            </div>

            {/* System Status & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                {/* 3proxy Status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">3proxy Status</h3>
                        <SignalIcon
                            className={`h-5 w-5 ${systemStatus?.status.isRunning ? "text-green-500" : "text-red-500"}`}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">State</span>
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${systemStatus?.status.isRunning ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`}
                            >
                                {systemStatus?.status.isRunning ? "Running" : "Stopped"}
                            </span>
                        </div>
                        {systemStatus?.status.isRunning && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">PID</span>
                                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                                        {systemStatus.status.pid}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Memory</span>
                                    <span className="text-sm text-gray-900 dark:text-white">
                                        {systemStatus.status.memoryUsage
                                            ? formatBytes(systemStatus.status.memoryUsage)
                                            : "N/A"}
                                    </span>
                                </div>
                            </>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Version</span>
                            <span className="text-sm text-gray-900 dark:text-white font-mono text-xs">
                                {systemStatus?.status.version}
                            </span>
                        </div>
                    </div>
                </div>

                {/* User Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Proxy Users</h3>
                        <CircleStackIcon className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="space-y-2">
                        {userSummary && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                        {userSummary.total.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                        {userSummary.active.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Inactive</span>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        {userSummary.inactive.toLocaleString()}
                                    </span>
                                </div>
                            </>
                        )}
                        {!userSummary && <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded" />}
                    </div>
                </div>

                {/* Traffic Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Traffic Overview</h3>
                        <ArrowPathIcon className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="space-y-2">
                        {trafficStats && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Requests</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {trafficStats.totalRequests.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Sent</span>
                                    <span className="text-sm text-gray-900 dark:text-white">
                                        {formatBytes(trafficStats.totalSent)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Received</span>
                                    <span className="text-sm text-gray-900 dark:text-white">
                                        {formatBytes(trafficStats.totalReceived)}
                                    </span>
                                </div>
                            </>
                        )}
                        {!trafficStats && <div className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded" />}
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Information</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Config Modified</span>
                            <span className="text-sm text-gray-900 dark:text-white">
                                {formatRelativeTime(systemStatus?.config.modified || null)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Users File</span>
                            <span className="text-sm text-gray-900 dark:text-white">
                                {systemStatus?.users.count || 0} entries
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Log Files</span>
                            <span className="text-sm text-gray-900 dark:text-white">
                                {systemStatus?.logs.fileCount || 0} files ({formatBytes(systemStatus?.logs.size || 0)})
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Last Update</span>
                            <span className="text-sm text-gray-900 dark:text-white">
                                {new Date().toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Traffic Sync</span>
                            <span className="text-sm text-gray-900 dark:text-white">
                                {systemStatus?.trafficSync?.lastSync
                                    ? formatRelativeTime(systemStatus.trafficSync.lastSync)
                                    : "Never"}
                            </span>
                        </div>
                        {systemStatus?.trafficSync?.updatedCount && (
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Synced Users</span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {systemStatus.trafficSync.updatedCount}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
