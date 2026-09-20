"use client";

import CustomDatePicker from "@/src/components/custom-date-picker";

interface UserExpirationSectionProps {
    dataLimit: string;
    dataLimitUnit: "MB" | "GB";
    onDataLimitChange: (value: string) => void;
    onDataLimitUnitChange: (unit: "MB" | "GB") => void;
    expiresAt: string;
    onExpiresAtChange: (value: string) => void;
}

export default function UserExpirationSection({
    dataLimit,
    dataLimitUnit,
    onDataLimitChange,
    onDataLimitUnitChange,
    expiresAt,
    onExpiresAtChange
}: UserExpirationSectionProps) {
    return (
        <>
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
                        onChange={(e) => onDataLimitChange(e.target.value)}
                    />
                    <select
                        className="px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 bg-white text-gray-900 dark:text-white text-base sm:text-sm min-h-[44px] appearance-none"
                        value={dataLimitUnit}
                        onChange={(e) => onDataLimitUnitChange(e.target.value === "GB" ? "GB" : "MB")}
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
                    onChange={onExpiresAtChange}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Leave empty for no expiration</p>
            </div>
        </>
    );
}
