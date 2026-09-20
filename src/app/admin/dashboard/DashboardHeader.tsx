"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface DashboardHeaderProps {
    refreshing: boolean;
    onRefresh: () => Promise<void>;
}

export default function DashboardHeader({ refreshing, onRefresh }: DashboardHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="mt-2 text-base text-gray-500 dark:text-gray-400">3proxy management overview</p>
            </div>
            <div className="flex items-center gap-3">
                <button
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50 ${refreshing ? "animate-spin" : ""}`}
                    disabled={refreshing}
                    onClick={onRefresh}
                >
                    <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                </button>
            </div>
        </div>
    );
}
