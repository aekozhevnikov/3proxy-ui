import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import UserForm from "@/app/admin/users/components/user-form";
import { ProxyUser, EditProxyUserRequest } from "@/core/definitions";
import { showToast } from "@/core/toast-utils";

async function fetchUserById(id: number): Promise<ProxyUser | null> {
    const response = await fetch(`/api/admin/users/${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.user || null;
}

async function handleUpdateUser(data: EditProxyUserRequest): Promise<ProxyUser | void> {
    const response = await fetch(`/api/admin/users/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(responseData.message || "Failed to update user");
    }

    showToast(`User "${data.username}" updated successfully`, "success");
    return responseData.user;
}

function EditUserPageContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [user, setUser] = useState<ProxyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (!isAuthenticated) {
        navigate("/login", { replace: true });
        return;
      }

      const { id } = params;
      if (id) {
        const userData = await fetchUserById(Number(id));
        if (isCancelled) return;
        setUser(userData);
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadData();
    }

    return () => {
      isCancelled = true;
    };
  }, [params, isAuthenticated, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl">
            User not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Proxy User</h1>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
          <UserForm user={user} onUpdate={handleUpdateUser} />
        </div>
      </div>
    </div>
  );
}

export default function EditUserPage() {
  return <EditUserPageContent />;
}
