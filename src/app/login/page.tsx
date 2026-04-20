"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";

import { MoonFilledIcon, SunFilledIcon } from "@/src/components/icons";

export default function LoginPage() {
    const { theme, setTheme } = useTheme();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const data = await res.json();

                throw new Error(data.error || "Invalid credentials");
            }

            // Force full page reload to ensure session cookie is sent
            window.location.href = "/admin/users";
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <Image
                            alt="3proxy"
                            className="h-32 w-32"
                            height={128}
                            loading="eager"
                            src="/favicon.svg"
                            width={128}
                        />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">3proxy UI</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to manage proxy users</p>
                </div>

                <form
                    className="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 pt-16 rounded-xl shadow-lg relative"
                    onSubmit={handleSubmit}
                >
                    <button
                        aria-label="Toggle theme"
                        className="absolute top-4 right-4 px-3 py-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        type="button"
                        onClick={toggleTheme}
                    >
                        <div className="relative h-5 w-5">
                            <MoonFilledIcon className="h-5 w-5 text-blue-600 dark:hidden" />
                            <SunFilledIcon className="h-5 w-5 text-amber-500 hidden dark:block" />
                        </div>
                    </button>
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-full">
                            {error}
                        </div>
                    )}

                    <div>
                        <label
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            htmlFor="username"
                        >
                            Username
                        </label>
                        <input
                            required
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white min-h-[44px]"
                            id="username"
                            placeholder="Enter username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div>
                        <label
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <input
                            required
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white min-h-[44px]"
                            id="password"
                            placeholder="Enter password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        className="w-full px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-full transition-colors flex items-center justify-center gap-2"
                        disabled={isLoading}
                        type="submit"
                    >
                        {isLoading && (
                            <svg
                                className="animate-spin h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    fill="currentColor"
                                />
                            </svg>
                        )}
                        <span>{isLoading ? "Signing in..." : "Sign in"}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
