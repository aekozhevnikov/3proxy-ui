"use client";

import React, { useState } from "react";

const EYE_SVG =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z'%3E%3C/path%3E%3Cpath d='M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'%3E%3C/path%3E%3C/svg%3E";

const EYE_SLASH_SVG =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88'%3E%3C/path%3E%3C/svg%3E";

interface PasswordInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    placeholder?: string;
    maxLength?: number;
    className?: string;
}

export default function PasswordInputWithToggle({
    id,
    label,
    value,
    onChange,
    required,
    placeholder,
    maxLength = 128,
    className = ""
}: PasswordInputProps) {
    const [show, setShow] = useState(false);

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor={id}>
                {label}
            </label>
            <input
                className={`w-full px-3 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base min-h-[44px] bg-center bg-no-repeat bg-contain ${className}`}
                id={id}
                maxLength={maxLength}
                placeholder={placeholder}
                required={required}
                style={{
                    backgroundImage: `url('${show ? EYE_SLASH_SVG : EYE_SVG}')`,
                    backgroundPosition: "right 0.75rem center"
                }}
                type={show ? "text" : "password"}
                value={value}
                onChange={onChange}
            />
            <button
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
                tabIndex={-1}
                type="button"
                onClick={() => setShow(!show)}
            >
                <span className="sr-only">{show ? "Hide password" : "Show password"}</span>
            </button>
        </div>
    );
}
