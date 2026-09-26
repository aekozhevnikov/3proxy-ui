"use client";

import UserActionsMenu from "./UserActionsMenu";

import { Infinity as LucideInfinity } from "lucide-react";
import { ProxyUser } from "@/src/core/definitions";
import { formatDate, formatGB } from "@/src/core/utils";

interface UserTableRowProps {
    user: ProxyUser;
    expandedUserIds: Set<number>;
    testingUserId: number | null;
    testProxyError: string | null;
    onShare: (user: ProxyUser) => void;
    onTestProxy: (username: string, userId: number) => void;
    onEdit: (user: ProxyUser) => void;
    onDelete: (userId: number) => void;
    toggleExpand: (userId: number) => void;
}

export default function UserTableRow({
    user,
    expandedUserIds,
    testingUserId,
    testProxyError,
    onShare,
    onTestProxy,
    onEdit,
    onDelete,
    toggleExpand
}: UserTableRowProps) {
    const isExpanded = expandedUserIds.has(user.id);

    return (
        <>
            <tr className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{user.username}</div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                    <span
                        className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium ${
                            user.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                        title={user.deactivatedAt ? `Deactivated: ${formatDate(user.deactivatedAt)}` : undefined}
                    >
                        {user.isActive ? "Active" : "Deactivated"}
                    </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm text-center">
                    {formatGB(Number(user.dataUsed))}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm">
                    <div className="flex items-center justify-center">
                        {user.dataLimit ? formatGB(Number(user.dataLimit)) : <LucideInfinity className="h-4 w-4" />}
                    </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm">
                    <div className="flex items-center justify-center">
                        {user.expiresAt ? formatDate(user.expiresAt) : <LucideInfinity className="h-4 w-4" />}
                    </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm text-center">
                    <div className="flex items-center justify-center">
                        {user.ipLimit === 0 ? <LucideInfinity className="h-4 w-4" /> : user.ipLimit}
                    </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm">
                    <div className="flex items-center justify-center">
                        {user.telegramUserId ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                <TelegramIcon className="w-3 h-3 mr-1" />
                                {user.telegramUserId}
                            </span>
                        ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                    </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right flex items-center justify-end gap-2">
                    <UserActionsMenu
                        testingUserId={testingUserId}
                        testProxyError={testProxyError}
                        user={user}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onShare={onShare}
                        onTestProxy={onTestProxy}
                    />
                    <button
                        aria-label="Toggle details"
                        className="p-1 shrink-0 lg:hidden"
                        onClick={() => toggleExpand(user.id)}
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        </svg>
                    </button>
                </td>
            </tr>
            {isExpanded && (
                <tr className="hidden md:table-row">
                    <td
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700"
                        colSpan={8}
                    >
                        <div className="flex flex-wrap gap-4 text-sm items-center">
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500 dark:text-gray-400">Data Usage:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {formatGB(Number(user.dataUsed))}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500 dark:text-gray-400">Data Limit:</span>
                                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                    {user.dataLimit ? (
                                        formatGB(Number(user.dataLimit))
                                    ) : (
                                        <LucideInfinity className="h-4 w-4" />
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500 dark:text-gray-400">IP Limit:</span>
                                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                    {user.ipLimit === 0 ? <LucideInfinity className="h-4 w-4" /> : user.ipLimit}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                    {user.expiresAt ? (
                                        formatDate(user.expiresAt)
                                    ) : (
                                        <LucideInfinity className="h-4 w-4" />
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500 dark:text-gray-400">Deactivated:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {user.deactivatedAt ? formatDate(user.deactivatedAt) : "Never"}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-500 dark:text-gray-400">Telegram:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {user.telegramUserId || "—"}
                                </span>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

function TelegramIcon({ className = "w-3 h-3" }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
    );
}
