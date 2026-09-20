"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ProxyUser, NewProxyUserRequest, EditProxyUserRequest } from "@/src/core/definitions";
import { createProxyUser as createProxyUserAction } from "@/src/core/actions/proxy-user";
import { showToast } from "@/src/core/toast-utils";

interface UseUsersOptions {
    fetchEnabled?: boolean;
    initialUsers?: ProxyUser[];
    pollInterval?: number;
}

interface UseUsersResult {
    users: ProxyUser[];
    loading: boolean;
    error: string | null;
    fetchUsers: () => Promise<void>;
    createUser: (data: NewProxyUserRequest) => Promise<void>;
    updateUser: (data: EditProxyUserRequest) => Promise<void>;
    deleteUser: (id: number) => Promise<void>;
    refetch: () => Promise<void>;
}

export function useUsers(options?: UseUsersOptions): UseUsersResult {
    const { fetchEnabled = true, initialUsers = [], pollInterval = 5000 } = options || {};

    const stableInitialUsers = useRef<ProxyUser[]>(initialUsers);
    const [users, setUsers] = useState<ProxyUser[]>(stableInitialUsers.current);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch("/api/admin/users");

            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }

            const data = await response.json();

            if (data.success && Array.isArray(data.users)) {
                setUsers(data.users);
            } else {
                throw new Error("Invalid response format");
            }
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch users");
        } finally {
            setLoading(false);
        }
    }, []);

    const createUser = useCallback(
        async (data: NewProxyUserRequest) => {
            try {
                setError(null);

                await createProxyUserAction(data);
                await fetchUsers();
                showToast(`User "${data.username}" created successfully`, "success");
            } catch (err) {
                console.error("Create error:", err);
                const errorMsg = err instanceof Error ? err.message : "Failed to create user";

                showToast(errorMsg, "error");
                setError(errorMsg);
            }
        },
        [fetchUsers]
    );

    const updateUser = useCallback(
        async (data: EditProxyUserRequest) => {
            try {
                setError(null);

                const response = await fetch(`/api/admin/users/${data.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                const responseData = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(responseData.message || "Failed to update user");
                }

                await fetchUsers();
                showToast(`User "${data.username}" updated successfully`, "success");
            } catch (err) {
                console.error("Update error:", err);
                const errorMsg = err instanceof Error ? err.message : "Failed to update user";

                showToast(errorMsg, "error");
                setError(errorMsg);
            }
        },
        [fetchUsers]
    );

    const deleteUser = useCallback(
        async (id: number) => {
            try {
                setError(null);

                const response = await fetch(`/api/admin/users/${id}`, {
                    method: "DELETE"
                });

                if (!response.ok) {
                    throw new Error("Failed to delete user");
                }

                await fetchUsers();
                showToast("User deleted successfully", "success");
            } catch (err) {
                console.error("Delete error:", err);
                const errorMsg = err instanceof Error ? err.message : "Failed to delete user";

                showToast(errorMsg, "error");
                setError(errorMsg);
            }
        },
        [fetchUsers]
    );

    // Initial fetch and polling
    useEffect(() => {
        if (!fetchEnabled) {
            setUsers(stableInitialUsers.current);

            return;
        }

        fetchUsers();

        const interval = setInterval(fetchUsers, pollInterval);

        return () => clearInterval(interval);
    }, [fetchEnabled, stableInitialUsers, pollInterval, fetchUsers]);

    return {
        users,
        loading,
        error,
        fetchUsers,
        createUser,
        updateUser,
        deleteUser,
        refetch: fetchUsers
    };
}
