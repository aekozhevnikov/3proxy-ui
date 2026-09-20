"use client";

import UserTableRow from "./UserTableRow";

import { ProxyUser } from "@/src/core/definitions";

interface UserDesktopTableProps {
    users: ProxyUser[];
    expandedUserIds: Set<number>;
    toggleExpand: (userId: number) => void;
    onShare: (user: ProxyUser) => void;
    onTestProxy: (username: string, userId: number) => void;
    onEdit: (user: ProxyUser) => void;
    onDelete: (userId: number) => void;
    testingUserId: number | null;
}

export default function UserDesktopTable({
    users,
    expandedUserIds,
    toggleExpand,
    onShare,
    onTestProxy,
    onEdit,
    onDelete,
    testingUserId
}: UserDesktopTableProps) {
    if (users.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-white dark:bg-gray-900">
                        <tr>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Username
                            </th>
                            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                                Data Usage
                            </th>
                            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                                Data Limit
                            </th>
                            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                                Expires
                            </th>
                            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                                IP Limit
                            </th>
                            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                                Telegram
                            </th>
                            <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((user) => (
                            <UserTableRow
                                key={user.id}
                                expandedUserIds={expandedUserIds}
                                testingUserId={testingUserId}
                                toggleExpand={toggleExpand}
                                user={user}
                                onDelete={onDelete}
                                onEdit={onEdit}
                                onShare={onShare}
                                onTestProxy={onTestProxy}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
