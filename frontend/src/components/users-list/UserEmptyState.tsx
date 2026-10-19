"use client";

export default function UserEmptyState() {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
                No users found. Click &quot;Add User&quot; in the header to create your first user!
            </p>
        </div>
    );
}
