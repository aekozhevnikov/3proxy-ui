"use client";

import { useState } from "react";

import { ProxyUser } from "@/src/core/definitions";
import { showToast } from "@/src/core/toast-utils";

interface UseUserModalsResult {
    isCreateModalOpen: boolean;
    editingUser: ProxyUser | null;
    shareUser: ProxyUser | null;
    sharePassword: string | null;
    deleteUserId: number | null;
    openCreateModal: () => void;
    closeCreateModal: () => void;
    openEditModal: (user: ProxyUser) => void;
    closeEditModal: () => void;
    openDeleteModal: (userId: number) => void;
    closeDeleteModal: () => void;
    openShareModal: (user: ProxyUser) => void;
    closeShareModal: () => void;
}

export function useUserModals(): UseUserModalsResult {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<ProxyUser | null>(null);
    const [shareUser, setShareUser] = useState<ProxyUser | null>(null);
    const [sharePassword, setSharePassword] = useState<string | null>(null);
    const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

    const openCreateModal = () => setIsCreateModalOpen(true);
    const closeCreateModal = () => setIsCreateModalOpen(false);

    const openEditModal = (user: ProxyUser) => {
        setEditingUser(user);
    };
    const closeEditModal = () => {
        setEditingUser(null);
    };

    const openDeleteModal = (userId: number) => setDeleteUserId(userId);
    const closeDeleteModal = () => setDeleteUserId(null);

    const openShareModal = async (user: ProxyUser) => {
        setShareUser(user);
        setSharePassword(null);

        try {
            const response = await fetch(`/api/admin/users/${user.id}/share`);

            const data = await response.json();

            if (response.ok && data.success) {
                setSharePassword(data.password);
            } else {
                setShareUser(null);
                showToast(data.error || "Failed to load user credentials", "error");
            }
        } catch {
            setShareUser(null);
            showToast("Failed to load user credentials", "error");
        }
    };

    const closeShareModal = () => {
        setShareUser(null);
        setSharePassword(null);
    };

    return {
        isCreateModalOpen,
        editingUser,
        shareUser,
        sharePassword,
        deleteUserId,
        openCreateModal,
        closeCreateModal,
        openEditModal,
        closeEditModal,
        openDeleteModal,
        closeDeleteModal,
        openShareModal,
        closeShareModal
    };
}
