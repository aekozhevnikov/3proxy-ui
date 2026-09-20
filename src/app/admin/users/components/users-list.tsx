"use client";

import { useMemo } from "react";

import ShareModal from "./share-modal";
import UserForm from "./user-form";

import { ProxyUser, NewProxyUserRequest, EditProxyUserRequest } from "@/src/core/definitions";
import { useUsers } from "@/src/hooks/useUsers";
import { useUserModals } from "@/src/hooks/useUserModals";
import { useUsersActions } from "@/src/hooks/useUsersActions";
import UserHeader from "@/src/components/users-list/UserHeader";
import UserDesktopTable from "@/src/components/users-list/UserDesktopTable";
import UserMobileCard from "@/src/components/users-list/UserMobileCard";
import UserEmptyState from "@/src/components/users-list/UserEmptyState";
import DeleteConfirmModal from "@/src/components/users-list/DeleteConfirmModal";
import UserModal from "@/src/components/users-list/UserModal";

type StatusFilter = "all" | "active" | "deactivated";

interface UsersListProps {
    users?: ProxyUser[];
    fetchEnabled?: boolean;
}

export default function UsersList({ users: initialUsers, fetchEnabled = true }: UsersListProps) {
    const {
        users: currentUsers,
        createUser,
        updateUser,
        deleteUser,
        refetch
    } = useUsers({ initialUsers, fetchEnabled });

    const {
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
    } = useUserModals();

    const {
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
    } = useUsersActions({
        users: currentUsers,
        createUser,
        updateUser,
        deleteUser,
        refetch
    });

    const filteredUsers = useMemo(() => {
        return currentUsers.filter((user) => {
            if (statusFilter === "all") return true;
            if (statusFilter === "active") return user.isActive;
            if (statusFilter === "deactivated") return !user.isActive;

            return true;
        });
    }, [currentUsers, statusFilter]);

    return (
        <div>
            <UserHeader
                expandedUserIds={expandedUserIds}
                filteredUsers={filteredUsers}
                isReloading={isReloading}
                statusFilter={statusFilter}
                onOpenCreateModal={openCreateModal}
                onReloadConfig={handleReloadConfig}
                onStatusFilterChange={setStatusFilter}
                onToggleExpandAll={toggleExpandAll}
            />

            {currentUsers.length === 0 ? (
                <UserEmptyState />
            ) : (
                <>
                    <div className="hidden md:block">
                        <UserDesktopTable
                            expandedUserIds={expandedUserIds}
                            testingUserId={testingUserId}
                            toggleExpand={toggleExpand}
                            users={filteredUsers}
                            onDelete={openDeleteModal}
                            onEdit={(user) => handleOpenEditModalWithFetch(user, openEditModal)}
                            onShare={openShareModal}
                            onTestProxy={handleTestProxy}
                        />
                    </div>

                    <div className="md:hidden">
                        {filteredUsers.map((user) => (
                            <UserMobileCard
                                key={user.id}
                                isExpanded={
                                    expandedUserIds.has(user.id) || expandedUserIds.size === currentUsers.length
                                }
                                testingUserId={testingUserId}
                                user={user}
                                onDelete={openDeleteModal}
                                onEdit={(user) => handleOpenEditModalWithFetch(user, openEditModal)}
                                onShare={openShareModal}
                                onTestProxy={handleTestProxy}
                                onToggleExpand={toggleExpand}
                            />
                        ))}
                    </div>
                </>
            )}

            {shareUser && (
                <ShareModal
                    isOpen={Boolean(shareUser)}
                    password={shareUser.password}
                    username={shareUser.username}
                    onClose={closeShareModal}
                />
            )}

            {editingUser && (
                <UserModal
                    user={editingUser}
                    title="Edit User"
                    description={`Editing user: ${editingUser.username}`}
                    isOpen={Boolean(editingUser)}
                    onClose={closeEditModal}
                    onUpdate={async (data: EditProxyUserRequest) => {
                        await handleUpdateUser(data, closeEditModal);
                    }}
                />
            )}

            <DeleteConfirmModal
                isDeleting={isDeleting}
                userId={deleteUserId}
                onCancel={closeDeleteModal}
                onConfirm={async () => {
                    await handleDeleteUser(deleteUserId!, closeDeleteModal);
                }}
            />

            {isCreateModalOpen && (
                <UserModal
                    title="Create Proxy User"
                    description="Add a new proxy user with custom settings"
                    isOpen={isCreateModalOpen}
                    onClose={closeCreateModal}
                    onCreate={async (data: NewProxyUserRequest) => {
                        await handleCreateUser(data, closeCreateModal);
                    }}
                />
            )}
        </div>
    );
}
