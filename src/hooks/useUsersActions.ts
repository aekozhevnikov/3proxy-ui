import { useState } from "react";

import { ProxyUser, NewProxyUserRequest, EditProxyUserRequest } from "@/src/core/definitions";
import { showToast } from "@/src/core/toast-utils";

type StatusFilter = "all" | "active" | "deactivated";

interface UseUsersActionsOptions {
    users: ProxyUser[];
    createUser: (data: NewProxyUserRequest) => Promise<ProxyUser | void>;
    updateUser: (data: EditProxyUserRequest) => Promise<ProxyUser | void>;
    deleteUser: (id: number) => Promise<void>;
    refetch: () => Promise<void>;
}

export function useUsersActions({ users, createUser, updateUser, deleteUser, refetch }: UseUsersActionsOptions) {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [expandedUserIds, setExpandedUserIds] = useState<Set<number>>(new Set());
    const [isReloading, setIsReloading] = useState(false);
    const [testingUserId, setTestingUserId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
        if (expandedUserIds.size === users.length) {
            setExpandedUserIds(new Set());
        } else {
            setExpandedUserIds(new Set(users.map((u) => u.id)));
        }
    };

    const handleReloadConfig = async () => {
        setIsReloading(true);
        try {
            const response = await fetch("/api/config/reload", { method: "POST" });
            const data = await response.json();

            if (response.ok && data.success) {
                showToast("Configuration reloaded successfully!", "success");
                await refetch();
            } else {
                showToast(data.message || "Failed to reload configuration", "error");
            }
        } catch {
            showToast("Failed to reload configuration", "error");
        } finally {
            setIsReloading(false);
        }
    };

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

    const handleUpdateUser = async (data: EditProxyUserRequest, closeEditModal: () => void) => {
        try {
            await updateUser(data);
            closeEditModal();
        } catch (e) {
            console.error("Update error:", e);
        }
    };

    const handleCreateUser = async (data: NewProxyUserRequest, closeCreateModal: () => void) => {
        try {
            await createUser(data);
            closeCreateModal();
        } catch (e) {
            console.error("Create error:", e);
        }
    };

    const handleDeleteUser = async (userId: number, closeDeleteModal: () => void) => {
        setIsDeleting(true);
        try {
            await deleteUser(userId);
            closeDeleteModal();
        } catch (e) {
            console.error("Delete error:", e);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenEditModalWithFetch = async (user: ProxyUser, openEditModal: (user: ProxyUser) => void) => {
        try {
            const response = await fetch(`/api/admin/users/${user.id}`);

            if (response.ok) {
                const data = await response.json();

                openEditModal(data.user);
            } else {
                console.warn(`Failed to fetch user ${user.id}, using local data`);
                openEditModal(user);
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            openEditModal(user);
        }
    };

    return {
        statusFilter,
        expandedUserIds,
        isReloading,
        testingUserId,
        isDeleting,
        setStatusFilter,
        toggleExpand,
        toggleExpandAll,
        handleReloadConfig,
        handleTestProxy,
        handleUpdateUser,
        handleCreateUser,
        handleDeleteUser,
        handleOpenEditModalWithFetch
    };
}
