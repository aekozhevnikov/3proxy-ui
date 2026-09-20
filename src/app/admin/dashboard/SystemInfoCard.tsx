"use client";

import { formatBytes, formatRelativeTime } from "@/src/core/utils";
import { SystemStatus } from "@/src/app/admin/dashboard/useDashboardData";

interface SystemInfoCardProps {
    systemStatus: SystemStatus | null;
}

export default function SystemInfoCard({ systemStatus }: SystemInfoCardProps) {
    return (
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
                    <span className="text-sm text-gray-900 dark:text-white">{new Date().toLocaleTimeString()}</span>
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
    );
}
