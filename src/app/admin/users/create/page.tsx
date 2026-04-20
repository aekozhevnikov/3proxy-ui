import { Metadata } from "next";

import UserForm from "@/src/app/admin/users/components/user-form";
import { createProxyUser } from "@/src/core/actions/proxy-user";
import { createPageTitle } from "@/src/core/utils";

export const metadata: Metadata = {
    title: createPageTitle("Create Proxy User")
};

export default function CreateProxyUserPage() {
    return (
        <div className="container mx-auto px-4 py-6 sm:py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Create Proxy User</h1>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
                    <UserForm onCreate={createProxyUser} />
                </div>
            </div>
        </div>
    );
}
