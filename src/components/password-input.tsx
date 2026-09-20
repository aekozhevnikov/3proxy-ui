"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

import { generatePassword } from "@/src/core/password-hash";

interface PasswordInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    placeholder?: string;
    className?: string;
    showGenerate?: boolean;
    onPasswordGenerated?: (password: string) => void;
}

export default function PasswordInput({
    id,
    label,
    value,
    onChange,
    required,
    placeholder,
    className = "",
    showGenerate = false,
    onPasswordGenerated
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    const handleGenerate = () => {
        const newPassword = generatePassword();

        onPasswordGenerated?.(newPassword);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor={id}>
                {label}
            </label>
            <div className="relative">
                <input
                    className={`w-full px-3 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base min-h-[44px] ${className}`}
                    id={id}
                    maxLength={128}
                    placeholder={placeholder}
                    required={required}
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                />
                <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </button>
            </div>
            {showGenerate && (
                <div className="flex flex-col gap-2 mt-2">
                    <button
                        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-full transition-colors text-sm"
                        title="Generate 24-character secure password"
                        type="button"
                        onClick={handleGenerate}
                    >
                        Generate Secure Password
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Click Generate to create a cryptographically secure 24-character password
                    </p>
                </div>
            )}
        </div>
    );
}
