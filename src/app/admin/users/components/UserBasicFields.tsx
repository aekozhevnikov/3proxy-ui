"use client";

interface UserBasicFieldsProps {
    username: string;
    onUsernameChange: (username: string) => void;
}

export default function UserBasicFields({ username, onUsernameChange }: UserBasicFieldsProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="username">
                Username *
            </label>
            <input
                required
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base sm:text-sm"
                id="username"
                maxLength={64}
                placeholder="Enter username (max 64 characters)"
                type="text"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
            />
        </div>
    );
}
