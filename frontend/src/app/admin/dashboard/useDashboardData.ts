import { useEffect, useState } from "react";

export interface SystemStatus {
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

export interface UserSummary {
    total: number;
    active: number;
    inactive: number;
    withDataLimit: number;
}

export interface TrafficStats {
    totalSent: number;
    totalReceived: number;
    totalRequests: number;
}

export interface DashboardData {
    systemStatus: SystemStatus | null;
    userSummary: UserSummary | null;
    trafficStats: TrafficStats | null;
}

export interface UseDashboardDataResult {
    data: DashboardData;
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export default function useDashboardData(pollIntervalMs = 30000): UseDashboardDataResult {
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
    const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                    const username = log.auth?.user || "anonymous";

                    if (username !== "anonymous" && username !== "-") {
                        const current = userMap.get(username) || {
                            requests: 0,
                            sent: 0,
                            received: 0
                        };

                        userMap.set(username, {
                            requests: current.requests + 1,
                            sent: current.sent + (log.bytes?.sent || 0),
                            received: current.received + (log.bytes?.received || 0)
                        });
                    }
                }

                const totalSent = Array.from(userMap.values()).reduce((sum, u) => sum + u.sent, 0);
                const totalReceived = Array.from(userMap.values()).reduce((sum, u) => sum + u.received, 0);
                const totalRequests = Array.from(userMap.values()).reduce((sum, u) => sum + u.requests, 0);

                setTrafficStats({
                    totalSent,
                    totalReceived,
                    totalRequests
                });
            }
        } catch (err) {
            console.error("Failed to fetch traffic stats:", err);
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

    const refresh = async () => {
        setRefreshing(true);
        try {
            await fetchAllData();
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, pollIntervalMs);

        return () => clearInterval(interval);
    }, []);

    return {
        data: { systemStatus, userSummary, trafficStats },
        loading,
        refreshing,
        error,
        refresh
    };
}
