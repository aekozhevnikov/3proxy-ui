import { Metadata } from "next";

import UserForm from "@/src/app/admin/users/components/user-form";
import { getProxyUserById, updateProxyUser } from "@/src/core/actions/proxy-user";
import { createPageTitle } from "@/src/core/utils";

interface EditUserPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditUserPageProps): Promise<Metadata> {
    const { id } = await params;
    const user = await getProxyUserById(Number(id));

    return {
        title: createPageTitle(user ? `Edit ${user.username}` : "Edit User")
    };
}

export default async function EditUserPage({ params }: EditUserPageProps) {
    const { id } = await params;
    const user = await getProxyUserById(Number(id));

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
                    <UserForm user={user} onUpdate={updateProxyUser} />
                </div>
            </div>
        </div>
    );
}
