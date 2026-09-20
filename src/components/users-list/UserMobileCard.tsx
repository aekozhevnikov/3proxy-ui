"use client";

import { Infinity as LucideInfinity } from "lucide-react";

import { ProxyUser } from "@/src/core/definitions";
import { formatDate, formatGB } from "@/src/core/utils";

interface UserMobileCardProps {
    user: ProxyUser;
    isExpanded: boolean;
    onToggleExpand: (userId: number) => void;
    onShare: (user: ProxyUser) => void;
    onTestProxy: (username: string, userId: number) => void;
    onEdit: (user: ProxyUser) => void;
    onDelete: (userId: number) => void;
    testingUserId: number | null;
}

export default function UserMobileCard({
    user,
    isExpanded,
    onToggleExpand,
    onShare,
    onTestProxy,
    onEdit,
    onDelete,
    testingUserId
}: UserMobileCardProps) {
    const actionButtons = (
        <>
            <button
                className="p-1.5 flex items-center justify-center text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-full transition-colors"
                title="Share"
                onClick={() => onShare(user)}
            >
                <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M8.069 5.5c.872-.5 1.853-.5 2.931-.5 1.08.0 2.156.0 2.931.5.745.481 1.418 1.214 1.9 2.093.48.877.756 1.915.756 3.025 0 1.11-.276 2.147-.756 3.025-.482.879-1.155 1.612-1.9 2.093-.775.5-1.856.5-2.932.5-1.08 0-2.155-.001-2.931-.496-.745-.481-1.418-1.214-1.9-2.093-.48-.877-.756-1.915-.756-3.025 0-1.11.276-2.147.756-3.025.482-.879 1.155-1.612 1.9-2.093z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                    />
                </svg>
            </button>
            <button
                className="p-1.5 flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={testingUserId === user.id || !user.isActive}
                title={user.isActive ? "Test Proxy" : "Test disabled for deactivated users"}
                onClick={() => user.isActive && onTestProxy(user.username, user.id)}
            >
                {testingUserId === user.id ? (
                    <div className="h-3 w-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M5 3v4a2 2 0 002 2h2l1 2h2l1-2h2a2 2 0 002-2V3m-4 4v4m0 4v4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                        />
                    </svg>
                )}
            </button>
            <button
                className="p-1.5 flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                title="Edit"
                onClick={() => onEdit(user)}
            >
                <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-5.5-7.5L17.5 2.5 19 4l-8 8-3 1l1-3z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                    />
                </svg>
            </button>
            <button
                className="p-1.5 flex items-center justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-full transition-colors"
                title="Delete"
                onClick={() => onDelete(user.id)}
            >
                <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M19 7l-.867 12.133A2 2 0 0116.138 21H7.862a2 2 0 01-1.975-1.86L5 7m5 4v5m0 0l-1 1m1-1l1 1m-4-9V4a1 1 0 011-1h4a1 1 0 011 1v3m-6 0h6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                    />
                </svg>
            </button>
            <button aria-label="Toggle details" className="p-0.5 shrink-0" onClick={() => onToggleExpand(user.id)}>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
            </button>
        </>
    );

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-2 mb-2 overflow-hidden">
            <div className="flex flex-col gap-1.5 mb-1.5">
                <div className="flex items-center justify-between gap-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-xs truncate flex-1 min-w-0">
                        {user.username}
                    </h3>
                    <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                            user.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                        title={user.deactivatedAt ? `Deactivated: ${formatDate(user.deactivatedAt)}` : undefined}
                    >
                        {user.isActive ? "Active" : "Deactivated"}
                    </span>
                </div>
                <div className="flex items-center justify-end gap-1.5 flex-wrap">{actionButtons}</div>
            </div>

            {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1.5 space-y-1">
                    <div className="flex justify-between text-[10px] gap-1">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Data Usage:</span>
                        <span className="text-gray-900 dark:text-white text-right break-all">
                            {formatGB(Number(user.dataUsed))}
                        </span>
                    </div>
                    <div className="flex justify-between text-[10px] gap-1">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Data Limit:</span>
                        <span className="text-gray-900 dark:text-white flex items-center gap-0.5 justify-end">
                            {user.dataLimit ? (
                                formatGB(Number(user.dataLimit))
                            ) : (
                                <LucideInfinity className="h-2.5 w-2.5" />
                            )}
                        </span>
                    </div>
                    <div className="flex justify-between text-[10px] gap-1">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">IP Limit:</span>
                        <span className="text-gray-900 dark:text-white text-right">{user.ipLimit || 1}</span>
                    </div>
                    <div className="flex justify-between text-[10px] gap-1">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Telegram:</span>
                        <span className="text-gray-900 dark:text-white text-right break-all">
                            {user.telegramUserId || "—"}
                        </span>
                    </div>
                    <div className="flex justify-between text-[10px] gap-1">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Expires:</span>
                        <span className="text-gray-900 dark:text-white flex items-center gap-0.5 justify-end">
                            {user.expiresAt ? formatDate(user.expiresAt) : <LucideInfinity className="h-2.5 w-2.5" />}
                        </span>
                    </div>
                    <div className="flex justify-between text-[10px] gap-1">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Deactivated:</span>
                        <span className="text-gray-900 dark:text-white text-right break-all">
                            {user.deactivatedAt ? formatDate(user.deactivatedAt) : "Never"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
