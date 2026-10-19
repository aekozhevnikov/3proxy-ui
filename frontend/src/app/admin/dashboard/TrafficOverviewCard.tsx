"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { formatBytes } from "@/src/core/utils";
import { TrafficStats } from "@/src/app/admin/dashboard/useDashboardData";

interface TrafficOverviewCardProps {
    trafficStats: TrafficStats | null;
}

export default function TrafficOverviewCard({ trafficStats }: TrafficOverviewCardProps) {
    return (
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
    );
}
