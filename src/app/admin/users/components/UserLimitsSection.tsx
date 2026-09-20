"use client";

import { Switch } from "@heroui/react";

interface UserLimitsSectionProps {
    isActive: boolean;
    onIsActiveChange: (isActive: boolean) => void;
    telegramUserId: string;
    onTelegramUserIdChange: (value: string) => void;
    ipLimit: number;
    onIpLimitChange: (value: number) => void;
}

export default function UserLimitsSection({
    isActive,
    onIsActiveChange,
    telegramUserId,
    onTelegramUserIdChange,
    ipLimit,
    onIpLimitChange
}: UserLimitsSectionProps) {
    return (
        <>
            <div className="flex items-center gap-3">
                <Switch isSelected={isActive} size="lg" onChange={onIsActiveChange}>
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
                    onChange={(e) => onTelegramUserIdChange(e.target.value.replace(/[^0-9]/g, ""))}
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
                    onChange={(e) => onIpLimitChange(parseInt(e.target.value) || 1)}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Maximum simultaneous connections from different IP addresses per user (requires 3proxy with IPCOUNT
                    support)
                </p>
            </div>
        </>
    );
}
