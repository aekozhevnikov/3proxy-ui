"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@heroui/react";

import { EditProxyUserRequest, NewProxyUserRequest, ProxyUser } from "@/src/core/definitions";
import CustomDatePicker from "@/src/components/custom-date-picker";
import { showToast } from "@/src/core/toast-utils";

// Generate cryptographically secure random password like: openssl rand -base64 24
function generatePassword(): string {
    const bytes = new Uint8Array(24);

    crypto.getRandomValues(bytes);

    // Convert to base64
    let binary = "";

    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    // Base64 encode and remove trailing padding
    return btoa(binary).replace(/=+$/, "");
}

interface UserFormProps {
    user?: ProxyUser;
    onCreate?: (data: NewProxyUserRequest) => Promise<ProxyUser | void>;
    onUpdate?: (data: EditProxyUserRequest) => Promise<ProxyUser | void>;
    onCancel?: () => void;
}

export default function UserForm({ user, onCreate, onUpdate, onCancel = () => {} }: UserFormProps) {
    const router = useRouter();
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isActive, setIsActive] = useState<boolean>(true);
    const [dataLimit, setDataLimit] = useState<string>("");
    const [dataLimitUnit, setDataLimitUnit] = useState<"MB" | "GB">("MB");
    const [expiresAt, setExpiresAt] = useState<string>("");
    const [ipLimit, setIpLimit] = useState<number>(1);
    const [telegramUserId, setTelegramUserId] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEdit = !!user;

    // Sync form state when user prop changes (e.g., when opening edit modal for different user)
    useEffect(() => {
        if (user) {
            setUsername(user.username || "");
            setIsActive(user.isActive ?? true);
            setPassword("");
            setConfirmPassword("");

            if (user.dataLimit) {
                const valueInMB = Number(user.dataLimit);

                if (valueInMB >= 1024) {
                    setDataLimit((valueInMB / 1024).toString());
                    setDataLimitUnit("GB");
                } else {
                    setDataLimit(valueInMB.toString());
                    setDataLimitUnit("MB");
                }
            } else {
                setDataLimit("");
                setDataLimitUnit("MB");
            }

            if (user.expiresAt) {
                setExpiresAt(new Date(user.expiresAt).toISOString().split("T")[0]);
            } else {
                setExpiresAt("");
            }

            setIpLimit(user.ipLimit || 1);
            setTelegramUserId(user.telegramUserId ?? "");
            setError(null);
        } else {
            // Creating new user - reset fields
            setUsername("");
            setPassword("");
            setConfirmPassword("");
            setIsActive(true);
            setDataLimit("");
            setDataLimitUnit("MB");
            setExpiresAt("");
            setIpLimit(1);
            setTelegramUserId("");
            setError(null);
        }
    }, [user]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!username.trim()) {
            setError("Username is required");

            return;
        }

        if (!isEdit && password !== confirmPassword) {
            setError("Passwords do not match");

            return;
        }

        if (!isEdit && !password) {
            setError("Password is required");

            return;
        }

        if (dataLimit && isNaN(Number(dataLimit))) {
            setError("Data limit must be a number");

            return;
        }

        // Check if trying to activate user with expired expiration date
        if (isActive && expiresAt) {
            const expirationDate = new Date(expiresAt);
            const now = new Date();

            if (expirationDate <= now) {
                const errorMsg = "Cannot activate user with expired expiration date";

                setError(errorMsg);
                showToast(errorMsg, "warning");

                return;
            }
        }

        setIsSubmitting(true);

        try {
            // Convert dataLimit to MB (database stores in MB)
            let dataLimitInMB: number | null = null;

            if (dataLimit) {
                const value = Number(dataLimit);

                dataLimitInMB = dataLimitUnit === "GB" ? value * 1024 : value;
            }

            const baseData = {
                username: username.trim(),
                isActive,
                dataLimit: dataLimitInMB,
                ipLimit: ipLimit || 1,
                telegramUserId: telegramUserId?.trim() || null,
                expiresAt: expiresAt ? new Date(expiresAt) : null
            };

            if (isEdit && user && onUpdate) {
                // Edit: password is optional
                const editData: EditProxyUserRequest = {
                    ...baseData,
                    id: user.id,
                    ...(password ? { password } : {})
                };

                await onUpdate(editData);
                showToast("User updated successfully", "success");
            } else if (onCreate) {
                // Create: password is required
                if (!password) {
                    setError("Password is required");
                    setIsSubmitting(false);

                    return;
                }
                const createData: NewProxyUserRequest = {
                    ...baseData,
                    password
                };

                await onCreate(createData);
                showToast("User created successfully", "success");
            } else {
                throw new Error("No submit handler provided");
            }

            // Navigate back to users list
            router.push("/admin/users");
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
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>

            {!isEdit && (
                <>
                    <div>
                        <label
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            htmlFor="password"
                        >
                            Password *
                        </label>
                        <div className="flex flex-col gap-2">
                            <input
                                required
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base min-h-[44px]"
                                id="password"
                                maxLength={128}
                                placeholder="Enter password (max 128 characters) or click Generate"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-full transition-colors text-sm"
                                title="Generate 24-character secure password"
                                type="button"
                                onClick={() => {
                                    const newPassword = generatePassword();

                                    setPassword(newPassword);
                                    setConfirmPassword(newPassword);
                                }}
                            >
                                ✨ Generate Secure Password
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Click Generate to create a cryptographically secure 24-character password
                        </p>
                    </div>

                    <div>
                        <label
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            htmlFor="confirmPassword"
                        >
                            Confirm Password *
                        </label>
                        <input
                            required
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base min-h-[44px]"
                            id="confirmPassword"
                            placeholder="Confirm password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </>
            )}

            {isEdit && (
                <>
                    <div className="mb-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Leave password fields empty to keep the current password
                        </p>
                    </div>
                    <div className="mb-4">
                        <label
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            htmlFor="newPassword"
                        >
                            New Password (optional)
                        </label>
                        <div className="flex flex-col gap-2">
                            <input
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-sm min-h-[44px]"
                                id="newPassword"
                                placeholder="Enter new password or click Generate"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-full transition-colors text-sm"
                                title="Generate 24-character secure password"
                                type="button"
                                onClick={() => {
                                    const newPassword = generatePassword();

                                    setPassword(newPassword);
                                    setConfirmPassword(newPassword);
                                }}
                            >
                                ✨ Generate Secure Password
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Click Generate to create a cryptographically secure 24-character password
                        </p>
                    </div>
                    <div className="mb-4">
                        <label
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            htmlFor="confirmNewPassword"
                        >
                            Confirm New Password
                        </label>
                        <input
                            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-sm sm:text-sm min-h-[44px]"
                            id="confirmNewPassword"
                            placeholder="Confirm new password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </>
            )}

            <div className="flex items-center gap-3">
                <Switch isSelected={isActive} size="lg" onChange={setIsActive}>
                    <Switch.Control>
                        <Switch.Thumb />
                    </Switch.Control>
                    <label
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                        htmlFor="isActive"
                    >
                        Active
                    </label>
                </Switch>
            </div>

            <div>
                <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    htmlFor="telegramUserId"
                >
                    Telegram User ID (optional)
                </label>
                <input
                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base sm:text-sm min-h-[44px]"
                    id="telegramUserId"
                    inputMode="numeric"
                    maxLength={20}
                    pattern="[0-9]*"
                    placeholder="e.g., 123456789 (max 20 digits)"
                    type="text"
                    value={telegramUserId}
                    onChange={(e) => {
                        // Allow only numeric input
                        const value = e.target.value.replace(/[^0-9]/g, "");

                        setTelegramUserId(value);
                    }}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Telegram user ID for sending notifications (optional, numeric only)
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="ipLimit">
                    Max IP Addresses
                </label>
                <input
                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base sm:text-sm min-h-[44px]"
                    id="ipLimit"
                    max="10"
                    min="1"
                    type="number"
                    value={ipLimit}
                    onChange={(e) => setIpLimit(parseInt(e.target.value) || 1)}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Maximum simultaneous connections from different IP addresses per user (requires 3proxy with IPCOUNT
                    support)
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="dataLimit">
                    Data Limit
                </label>
                <div className="flex gap-2">
                    <input
                        className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base sm:text-sm min-h-[44px]"
                        id="dataLimit"
                        min="0"
                        placeholder="Leave empty for unlimited"
                        type="number"
                        value={dataLimit}
                        onChange={(e) => setDataLimit(e.target.value)}
                    />
                    <select
                        className="px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base sm:text-sm min-h-[44px] appearance-none"
                        value={dataLimitUnit}
                        onChange={(e) => setDataLimitUnit(e.target.value === "GB" ? "GB" : "MB")}
                    >
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                    </select>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Leave empty for unlimited data</p>
            </div>

            <div>
                <CustomDatePicker
                    label="Select expiration date"
                    value={expiresAt}
                    onChange={(value) => setExpiresAt(value)}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Leave empty for no expiration</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                    className="w-full sm:w-auto px-4 py-2 sm:py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-full transition-colors"
                    disabled={isSubmitting}
                    type="submit"
                >
                    {isSubmitting ? <span className="flex items-center justify-center gap-2">Saving...</span> : "Save"}
                </button>

                <button
                    className="w-full sm:w-auto px-4 py-2 sm:py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-full transition-colors"
                    type="button"
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
