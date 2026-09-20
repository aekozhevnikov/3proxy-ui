"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EditProxyUserRequest, NewProxyUserRequest, ProxyUser } from "@/src/core/definitions";
import { showToast } from "@/src/core/toast-utils";
import UserBasicFields from "@/src/app/admin/users/components/UserBasicFields";
import UserPasswordSection from "@/src/app/admin/users/components/UserPasswordSection";
import UserLimitsSection from "@/src/app/admin/users/components/UserLimitsSection";
import UserExpirationSection from "@/src/app/admin/users/components/UserExpirationSection";

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
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
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

            <UserBasicFields username={username} onUsernameChange={setUsername} />

            <UserPasswordSection
                confirmPassword={confirmPassword}
                isEdit={isEdit}
                password={password}
                onConfirmPasswordChange={setConfirmPassword}
                onPasswordChange={setPassword}
                onPasswordGenerated={(pwd) => {
                    setPassword(pwd);
                    setConfirmPassword(pwd);
                }}
            />

            <UserLimitsSection
                ipLimit={ipLimit}
                isActive={isActive}
                telegramUserId={telegramUserId}
                onIpLimitChange={setIpLimit}
                onIsActiveChange={setIsActive}
                onTelegramUserIdChange={setTelegramUserId}
            />

            <UserExpirationSection
                dataLimit={dataLimit}
                dataLimitUnit={dataLimitUnit}
                expiresAt={expiresAt}
                onDataLimitChange={setDataLimit}
                onDataLimitUnitChange={setDataLimitUnit}
                onExpiresAtChange={setExpiresAt}
            />

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
