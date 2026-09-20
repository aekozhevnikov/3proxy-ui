"use client";

import { useState } from "react";

import { ProxyUser } from "@/src/core/definitions";

interface UseUserModalsResult {
    isCreateModalOpen: boolean;
    editingUser: ProxyUser | null;
    shareUser: ProxyUser | null;
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

    const openShareModal = (user: ProxyUser) => {
        setShareUser(user);
    };
    const closeShareModal = () => {
        setShareUser(null);
    };

    return {
        isCreateModalOpen,
        editingUser,
        shareUser,
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
