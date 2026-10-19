"use client";

import { SignalIcon } from "@heroicons/react/24/outline";

import { formatBytes } from "@/src/core/utils";
import { SystemStatus } from "@/src/app/admin/dashboard/useDashboardData";

interface SystemStatusCardProps {
    systemStatus: SystemStatus | null;
}

export default function SystemStatusCard({ systemStatus }: SystemStatusCardProps) {
    return (
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
                                {systemStatus.status.memoryUsage ? formatBytes(systemStatus.status.memoryUsage) : "N/A"}
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
    );
}
