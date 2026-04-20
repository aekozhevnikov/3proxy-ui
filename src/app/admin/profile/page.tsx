import { redirect } from "next/navigation";

import ProfileForm from "./components/profile-form";

import { currentSession } from "@/src/core/session";

export default async function ProfilePage() {
    const session = await currentSession();

    if (!session.isAuthorized || !session.username) {
        redirect("/login");
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
                <ProfileForm currentUsername={session.username} />
            </div>
        </div>
    );
}
