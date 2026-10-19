import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import UserForm from "@/app/admin/users/components/user-form";
import { NewProxyUserRequest, ProxyUser } from "@/core/definitions";
import { showToast } from "@/core/toast-utils";

async function handleCreateUser(data: NewProxyUserRequest): Promise<ProxyUser | void> {
    const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(responseData.message || "Failed to create user");
    }

    showToast(`User "${data.username}" created successfully`, "success");
    return responseData.user;
}

function CreateProxyUserPageContent() {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate("/login", { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 sm:py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Create Proxy User</h1>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
                    <UserForm onCreate={handleCreateUser} />
                </div>
            </div>
        </div>
    );
}

export default function CreateProxyUserPage() {
    return <CreateProxyUserPageContent />;
}
