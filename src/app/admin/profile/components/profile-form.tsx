"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
    currentUsername: string;
}

export default function ProfileForm({ currentUsername }: ProfileFormProps) {
    const router = useRouter();
    const [username, setUsername] = useState(currentUsername);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword && newPassword !== confirmPassword) {
            setError("New passwords do not match");

            return;
        }

        if (newPassword && newPassword.length < 8) {
            setError("New password must be at least 8 characters");

            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch("/api/auth/change-credentials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username.trim(),
                    currentPassword,
                    newPassword: newPassword || undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update profile");
            }

            setSuccess(data.message || "Profile updated successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            if (username !== currentUsername) {
                // Username changed, refresh to update UI
                setTimeout(() => router.refresh(), 1500);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm">
                    {success}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="username">
                    Username
                </label>
                <input
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white"
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your login username</p>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Leave password fields empty to keep current password
                </p>

                <div className="space-y-4">
                    <div>
                        <label
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            htmlFor="currentPassword"
                        >
                            Current Password
                        </label>
                        <input
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white"
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            htmlFor="newPassword"
                        >
                            New Password (optional)
                        </label>
                        <input
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white"
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            htmlFor="confirmPassword"
                        >
                            Confirm New Password
                        </label>
                        <input
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white"
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-full transition-colors"
                    disabled={isSubmitting}
                    type="submit"
                >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </button>

                <button
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-full transition-colors"
                    type="button"
                    onClick={() => router.back()}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
