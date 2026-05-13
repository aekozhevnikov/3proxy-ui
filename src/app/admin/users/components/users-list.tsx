"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowPathIcon,
    ChevronDownIcon,
    FunnelIcon,
    PencilIcon,
    PlayIcon,
    PlusIcon,
    ShareIcon,
    TrashIcon
} from "@heroicons/react/24/outline";
import { Infinity as LucideInfinity } from "lucide-react";
import { Button, ButtonGroup, Dropdown, Label } from "@heroui/react";

import ShareModal from "./share-modal";
import UserForm from "./user-form";

import { formatDate, formatGB } from "@/src/core/utils";
import { EditProxyUserRequest, NewProxyUserRequest, ProxyUser } from "@/src/core/definitions";
import { createProxyUser } from "@/src/core/actions/proxy-user";
import { showToast } from "@/src/core/toast-utils";

interface UsersListProps {
    // Kept for backward compatibility but not required if fetchEnabled
    users?: ProxyUser[];
    fetchEnabled?: boolean;
}

export default function UsersList({ users: initialUsers, fetchEnabled = true }: UsersListProps) {
    const [expandedUserIds, setExpandedUserIds] = useState<Set<number>>(new Set());
    const [shareUser, setShareUser] = useState<(typeof initialUsers)[0] | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingUser, setEditingUser] = useState<(typeof initialUsers)[0] | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [testingUserId, setTestingUserId] = useState<number | null>(null);
    const [currentUsers, setCurrentUsers] = useState<ProxyUser[]>(initialUsers || []);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [lastFetchError, setLastFetchError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactivated">("all");

    // Computed: filtered users based on statusFilter
    const filteredUsers = useMemo(() => {
        return currentUsers.filter((user) => {
            if (statusFilter === "all") return true;
            if (statusFilter === "active") return user.isActive;
            if (statusFilter === "deactivated") return !user.isActive;

            return true;
        });
    }, [currentUsers, statusFilter]);

    // Refs for modal click outside detection
    const editModalRef = useRef<HTMLDivElement>(null);
    const createModalRef = useRef<HTMLDivElement>(null);

    const openShareModal = (user: (typeof currentUsers)[0]) => {
        setShareUser(user);
        setIsShareModalOpen(true);
    };

    const closeShareModal = () => {
        setIsShareModalOpen(false);
        setShareUser(null);
    };

    const openDeleteModal = (userId: number) => {
        setDeleteUserId(userId);
    };

    const closeDeleteModal = () => {
        setDeleteUserId(null);
    };

    const openEditModal = async (user: (typeof currentUsers)[0]) => {
        try {
            // Fetch fresh user data to ensure we have the latest state
            console.debug(`Fetching user ${user.id} (${user.username}) for editing`);
            const response = await fetch(`/api/admin/users/${user.id}`);

            if (response.ok) {
                const data = await response.json();

                console.debug("User data received for edit:", {
                    id: data.user.id,
                    username: data.user.username,
                    isActive: data.user.isActive,
                    deactivatedAt: data.user.deactivatedAt
                });
                setEditingUser(data.user);
            } else {
                console.warn(`Failed to fetch user ${user.id}, using local data`);
                // Fallback to provided user if API fails
                setEditingUser(user);
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            setEditingUser(user);
        } finally {
            setIsEditModalOpen(true);
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingUser(null);
    };

    const openCreateModal = () => {
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
    };

    const toggleExpand = (userId: number) => {
        setExpandedUserIds((prev) => {
            const next = new Set(prev);

            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }

            return next;
        });
    };

    const toggleExpandAll = () => {
        if (expandedUserIds.size === filteredUsers.length) {
            setExpandedUserIds(new Set());
        } else {
            setExpandedUserIds(new Set(filteredUsers.map((u) => u.id)));
        }
    };

    // Fetch users from API
    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/admin/users");

            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }
            const data = await response.json();

            if (data.success && Array.isArray(data.users)) {
                setCurrentUsers(data.users);
                setLastFetchError(null);
            } else {
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            setLastFetchError(error instanceof Error ? error.message : "Failed to fetch users");
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        if (!fetchEnabled) {
            // If fetch is disabled, use the initial users prop
            setCurrentUsers(initialUsers || []);

            return;
        }

        // Initial fetch
        fetchUsers();

        // Set up polling every 5 seconds
        const interval = setInterval(fetchUsers, 5000);

        return () => clearInterval(interval);
    }, [fetchEnabled, initialUsers]);

    const handleReloadConfig = async () => {
        setIsReloading(true);
        try {
            const response = await fetch("/api/config/reload", { method: "POST" });
            const data = await response.json();

            if (response.ok && data.success) {
                showToast("Configuration reloaded successfully!", "success");
                // Refresh users list after config reload
                await fetchUsers();
            } else {
                showToast(data.message || "Failed to reload configuration", "error");
            }
        } catch {
            showToast("Failed to reload configuration", "error");
        } finally {
            setIsReloading(false);
        }
    };

    // Handle test proxy
    const handleTestProxy = async (username: string, userId: number) => {
        setTestingUserId(userId);
        try {
            const response = await fetch("/api/admin/users/test-proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast(`Proxy test successful for ${username}`, "success");
            } else {
                showToast(data.error || "Proxy test failed", "error");
            }
        } catch {
            showToast("Failed to test proxy", "error");
        } finally {
            setTestingUserId(null);
        }
    };

    // Handle click outside for Edit modal
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (editModalRef.current && !editModalRef.current.contains(event.target as Node)) {
                closeEditModal();
            }
        };

        if (isEditModalOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isEditModalOpen]);

    // Handle click outside for Create modal
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (createModalRef.current && !createModalRef.current.contains(event.target as Node)) {
                closeCreateModal();
            }
        };

        if (isCreateModalOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isCreateModalOpen]);

    const handleUpdateUser = async (data: EditProxyUserRequest) => {
        if (!editingUser) return;

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.message || "Failed to update user");
            }

            // Refresh users list immediately
            await fetchUsers();

            // Close modal
            closeEditModal();

            // Show success toast
            showToast(`User "${data.username}" updated successfully`, "success");
        } catch (e) {
            console.error("Update error:", e);
            const errorMsg = e instanceof Error ? e.message : "Failed to update user";

            showToast(errorMsg, "error");
            throw e;
        }
    };

    const handleCreateUser = async (data: NewProxyUserRequest) => {
        try {
            await createProxyUser(data);
            // Refresh users list immediately
            await fetchUsers();
            closeCreateModal();
            // Show success toast
            showToast(`User "${data.username}" created successfully`, "success");
        } catch (e) {
            console.error("Create error:", e);
            const errorMsg = e instanceof Error ? e.message : "Failed to create user";

            showToast(errorMsg, "error");
            throw e;
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteUserId) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/users/${deleteUserId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Failed to delete user");
            }

            // Refresh users list immediately
            await fetchUsers();

            // Show success toast
            showToast("User deleted successfully", "success");
        } catch (e) {
            console.error("Delete error:", e);
            const errorMsg = e instanceof Error ? e.message : "Failed to delete user";

            showToast(errorMsg, "error");
        } finally {
            setIsDeleting(false);
            closeDeleteModal();
        }
    };

    // Render empty state message but keep header with buttons

    // Mobile Card Layout
    const renderMobileCard = (user: (typeof currentUsers)[0]) => (
        <div key={user.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 mb-3 overflow-hidden">
            <div className="flex flex-col gap-2 mb-2">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate flex-1 min-w-0">{user.username}</h3>
                    <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                            user.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                        title={user.deactivatedAt ? `Deactivated: ${formatDate(user.deactivatedAt)}` : undefined}
                    >
                        {user.isActive ? "Active" : "Deactivated"}
                    </span>
                </div>
                <div className="flex items-center justify-end gap-2 flex-wrap">
                    <button
                        className="p-2 sm:p-3 flex items-center justify-center text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-full transition-colors"
                        title="Share"
                        onClick={() => openShareModal(user)}
                    >
                        <ShareIcon className="h-4 w-4" />
                    </button>
                    <button
                        className="p-2 sm:p-3 flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={testingUserId === user.id || !user.isActive}
                        title={user.isActive ? "Test Proxy" : "Test disabled for deactivated users"}
                        onClick={() => user.isActive && handleTestProxy(user.username, user.id)}
                    >
                        {testingUserId === user.id ? (
                            <div className="h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <PlayIcon className="h-4 w-4" />
                        )}
                    </button>
                    <button
                        className="p-2 sm:p-3 flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                        title="Edit"
                        onClick={() => openEditModal(user)}
                    >
                        <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                        className="p-2 sm:p-3 flex items-center justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-full transition-colors"
                        title="Delete"
                        onClick={() => openDeleteModal(user.id)}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                    <button aria-label="Toggle details" className="p-1 shrink-0" onClick={() => toggleExpand(user.id)}>
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        </svg>
                    </button>
                </div>
            </div>

            {(expandedUserIds.has(user.id) || expandedUserIds.size === currentUsers.length) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between text-xs gap-2">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Data Usage:</span>
                        <span className="text-gray-900 dark:text-white text-right break-all">{formatGB(Number(user.dataUsed))}</span>
                    </div>
                    <div className="flex justify-between text-xs gap-2">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Data Limit:</span>
                        <span className="text-gray-900 dark:text-white flex items-center gap-1 justify-end">
                            {user.dataLimit ? formatGB(Number(user.dataLimit)) : <LucideInfinity className="h-3 w-3" />}
                        </span>
                    </div>
                    <div className="flex justify-between text-xs gap-2">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">IP Limit:</span>
                        <span className="text-gray-900 dark:text-white text-right">{user.ipLimit || 1}</span>
                    </div>
                    <div className="flex justify-between text-xs gap-2">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Telegram:</span>
                        <span className="text-gray-900 dark:text-white text-right break-all">{user.telegramUserId || "—"}</span>
                    </div>
                    <div className="flex justify-between text-xs gap-2">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Expires:</span>
                        <span className="text-gray-900 dark:text-white flex items-center gap-1 justify-end">
                            {user.expiresAt ? formatDate(user.expiresAt) : <LucideInfinity className="h-3 w-3" />}
                        </span>
                    </div>
                    <div className="flex justify-between text-xs gap-2">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">Deactivated:</span>
                        <span className="text-gray-900 dark:text-white text-right break-all">
                            {user.deactivatedAt ? formatDate(user.deactivatedAt) : "Never"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );

    // Desktop Table Layout
    const renderDesktopTable = () => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Username
                            </th>
                            <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                            {/* Tablet (md): Only Username, Status, Actions */}
                            {/* Desktop (lg): All columns */}
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
                    <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-700">
                        {filteredUsers.map((user) => (
                            <Fragment key={user.id}>
                                {/* Main row */}
                                <tr className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                                            {user.username}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-center">
                                        <span
                                            className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium ${
                                                user.isActive
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                            }`}
                                            title={
                                                user.deactivatedAt
                                                    ? `Deactivated: ${formatDate(user.deactivatedAt)}`
                                                    : undefined
                                            }
                                        >
                                            {user.isActive ? "Active" : "Deactivated"}
                                        </span>
                                    </td>
                                    {/* Tablet/Desktop columns */}
                                    <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm text-center">
                                        {formatGB(Number(user.dataUsed))}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm">
                                        <div className="flex items-center justify-center">
                                            {user.dataLimit ? (
                                                formatGB(Number(user.dataLimit))
                                            ) : (
                                                <LucideInfinity className="h-4 w-4" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm">
                                        <div className="flex items-center justify-center">
                                            {user.expiresAt ? (
                                                formatDate(user.expiresAt)
                                            ) : (
                                                <LucideInfinity className="h-4 w-4" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm text-center">
                                        {user.ipLimit || 1}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm">
                                        <div className="flex items-center justify-center">
                                            {user.telegramUserId ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                                    <svg
                                                        className="w-3 h-3 mr-1"
                                                        fill="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                                    </svg>
                                                    {user.telegramUserId}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-right flex items-center justify-end gap-2">
                                        <button
                                            className={`p-2 sm:p-3 ${
                                                user.isActive
                                                    ? "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30"
                                                    : "text-gray-400 bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                                            } rounded-full transition-colors`}
                                            disabled={!user.isActive}
                                            title={user.isActive ? "Share" : "Share disabled for deactivated users"}
                                            onClick={() => user.isActive && openShareModal(user)}
                                        >
                                            <ShareIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="p-2 sm:p-3 flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={testingUserId === user.id || !user.isActive}
                                            title={user.isActive ? "Test Proxy" : "Test disabled for deactivated users"}
                                            onClick={() => user.isActive && handleTestProxy(user.username, user.id)}
                                        >
                                            {testingUserId === user.id ? (
                                                <div className="h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <PlayIcon className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            className="p-2 sm:p-3 flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                                            title="Edit"
                                            onClick={() => openEditModal(user)}
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="p-2 sm:p-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                            title="Delete"
                                            onClick={() => openDeleteModal(user.id)}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            aria-label="Toggle details"
                                            className="p-1 shrink-0 lg:hidden"
                                            onClick={() => toggleExpand(user.id)}
                                        >
                                            <svg
                                                className="w-5 h-5 text-gray-500"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    d="M19 9l-7 7-7-7"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                                {/* Expanded details row - horizontal layout on tablet/desktop */}
                                {(expandedUserIds.has(user.id) || expandedUserIds.size === filteredUsers.length) && (
                                    <tr className="hidden md:table-row">
                                        <td
                                            className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700"
                                            colSpan={8}
                                        >
                                            <div className="flex flex-wrap gap-4 text-sm items-center">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Data Usage:
                                                    </span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {formatGB(Number(user.dataUsed))}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Data Limit:
                                                    </span>
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
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {user.ipLimit || 1}
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
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Deactivated:
                                                    </span>
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
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div>
            {/* Header with title and buttons */}
            <div className="flex justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Proxy Users</h1>
                </div>
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Reload Config Button */}
                        <button
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50"
                            disabled={isReloading}
                            title="Reload 3proxy configuration"
                            onClick={handleReloadConfig}
                        >
                            {isReloading ? (
                                <div className="h-4 w-4 border-2 border-gray-700 dark:border-gray-300 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <ArrowPathIcon className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">{isReloading ? "Reloading..." : "Reload Config"}</span>
                        </button>

                        {/* Expand/Collapse all button - for tablet and mobile */}
                        <button
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors lg:hidden"
                            title={expandedUserIds.size === filteredUsers.length ? "Collapse all" : "Expand all"}
                            onClick={toggleExpandAll}
                        >
                            {expandedUserIds.size === filteredUsers.length ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            d="M5 15l7-7 7 7"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                        />
                                    </svg>
                                    <span>Collapse</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            d="M19 9l-7 7-7-7"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                        />
                                    </svg>
                                    <span>Expand</span>
                                </>
                            )}
                        </button>

                        {/* Status Filter ButtonGroup */}
                        <div className="flex items-center gap-2">
                            <ButtonGroup size="lg" variant="tertiary">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <FunnelIcon />
                                    {statusFilter}
                                </Button>
                                <Dropdown>
                                    <Button isIconOnly className="bg-blue-600 hover:bg-blue-700" size="lg">
                                        <ChevronDownIcon />
                                    </Button>
                                    <Dropdown.Popover className="max-w-[290px]" placement="bottom end">
                                        <Dropdown.Menu>
                                            <Dropdown.Item
                                                className="flex flex-col items-start gap-1"
                                                id="All"
                                                textValue="All"
                                                onClick={() => setStatusFilter("all")}
                                            >
                                                <Label>All</Label>
                                            </Dropdown.Item>
                                            <Dropdown.Item
                                                className="flex flex-col items-start gap-1"
                                                id="active"
                                                textValue="Active"
                                                onClick={() => setStatusFilter("active")}
                                            >
                                                <Label>Active</Label>
                                            </Dropdown.Item>
                                            <Dropdown.Item
                                                className="flex flex-col items-start gap-1"
                                                id="deactivated"
                                                textValue="Deactivated"
                                                onClick={() => setStatusFilter("deactivated")}
                                            >
                                                <Label>Deactivated</Label>
                                            </Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown.Popover>
                                </Dropdown>
                            </ButtonGroup>
                        </div>

                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors"
                            onClick={openCreateModal}
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span className="hidden sm:inline">Add User</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty State or Content */}
            {currentUsers.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        No users found. Click &quot;Add User&quot; in the header to create your first user!
                    </p>
                </div>
            ) : (
                <>
                    {/* Desktop: Table */}
                    <div className="hidden md:block">{renderDesktopTable()}</div>

                    {/* Mobile: Cards */}
                    <div className="md:hidden">{filteredUsers.map(renderMobileCard)}</div>
                </>
            )}

            {/* Share Modal */}
            {shareUser && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    password={shareUser.password}
                    username={shareUser.username}
                    onClose={closeShareModal}
                />
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div
                        ref={editModalRef}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Editing user:{" "}
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {editingUser.username}
                                </span>
                            </p>
                        </div>
                        <div className="p-6">
                            <UserForm
                                key={editingUser.id}
                                user={editingUser}
                                onCancel={closeEditModal}
                                onCreate={async () => {}}
                                onUpdate={handleUpdateUser}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteUserId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete User</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this user? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm rounded-full transition-colors"
                                disabled={isDeleting}
                                onClick={closeDeleteModal}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 hover:shadow-md rounded-full transition-colors disabled:opacity-50"
                                disabled={isDeleting}
                                onClick={handleDeleteUser}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div
                        ref={createModalRef}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Proxy User</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Add a new proxy user with custom settings
                            </p>
                        </div>
                        <div className="p-6">
                            <UserForm onCancel={closeCreateModal} onCreate={handleCreateUser} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
