"use client";

import PasswordInputWithToggle from "@/src/components/password-input-with-toggle";

interface PasswordChangeSectionProps {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    onCurrentPasswordChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
}

export default function PasswordChangeSection({
    currentPassword,
    newPassword,
    confirmPassword,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange
}: PasswordChangeSectionProps) {
    return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Leave password fields empty to keep current password
            </p>

            <div className="space-y-4">
                <PasswordInputWithToggle
                    required
                    id="currentPassword"
                    label="Current Password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => onCurrentPasswordChange(e.target.value)}
                />

                <PasswordInputWithToggle
                    id="newPassword"
                    label="New Password (optional)"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => onNewPasswordChange(e.target.value)}
                />

                <PasswordInputWithToggle
                    id="confirmPassword"
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => onConfirmPasswordChange(e.target.value)}
                />
            </div>
        </div>
    );
}
