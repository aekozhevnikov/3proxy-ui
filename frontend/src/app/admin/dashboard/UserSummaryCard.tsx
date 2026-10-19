"use client";

import { CircleStackIcon } from "@heroicons/react/24/outline";

import { UserSummary } from "@/src/app/admin/dashboard/useDashboardData";

interface UserSummaryCardProps {
    userSummary: UserSummary | null;
}

export default function UserSummaryCard({ userSummary }: UserSummaryCardProps) {
    return (
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
    );
}
