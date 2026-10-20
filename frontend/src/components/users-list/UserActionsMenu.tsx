"use client";

import { PencilIcon, PlayIcon, ShareIcon, TrashIcon } from "@heroicons/react/24/outline";

import { ProxyUser } from "@/src/core/definitions";

interface UserActionsMenuProps {
    user: ProxyUser;
    testingUserId: number | null;
    testProxyError: string | null;
    onShare: (user: ProxyUser) => void;
    onTestProxy: (username: string, userId: number) => void;
    onEdit: (user: ProxyUser) => void;
    onDelete: (userId: number) => void;
}

export default function UserActionsMenu({
    user,
    testingUserId,
    testProxyError,
    onShare,
    onTestProxy,
    onEdit,
    onDelete
}: UserActionsMenuProps) {
    return (
        <>
            <button
                className={`p-2 sm:p-3 ${
                    user.isActive
                        ? "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30"
                        : "text-gray-400 bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                } rounded-full transition-colors`}
                disabled={!user.isActive}
                title={user.isActive ? "Share" : "Share disabled for deactivated users"}
                onClick={() => user.isActive && onShare(user)}
            >
                <ShareIcon className="h-4 w-4" />
            </button>
            <button
                className="p-2 sm:p-3 flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={testingUserId === user.id || !user.isActive}
                title={
                    testProxyError && testingUserId === null
                        ? testProxyError
                        : user.isActive
                          ? "Test Proxy"
                          : "Test disabled for deactivated users"
                }
                onClick={() => user.isActive && onTestProxy(user.username, user.id)}
            >
                {testingUserId === user.id ? (
                    <div className="h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <PlayIcon className="h-4 w-4" data-testid="play-icon" />
                )}
            </button>
            <button
                className="p-2 sm:p-3 flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                title="Edit"
                onClick={() => onEdit(user)}
            >
                <PencilIcon className="h-4 w-4" data-testid="pencil-icon" />
            </button>
            <button
                className="p-2 sm:p-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-full transition-colors"
                title="Delete"
                onClick={() => onDelete(user.id)}
            >
                <TrashIcon className="h-4 w-4" />
            </button>
        </>
    );
}
