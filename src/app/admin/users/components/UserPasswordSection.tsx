"use client";

import PasswordInput from "@/src/components/password-input";

interface UserPasswordSectionProps {
    password: string;
    confirmPassword: string;
    isEdit: boolean;
    onPasswordChange: (password: string) => void;
    onConfirmPasswordChange: (password: string) => void;
    onPasswordGenerated: (password: string) => void;
}

export default function UserPasswordSection({
    password,
    confirmPassword,
    isEdit,
    onPasswordChange,
    onConfirmPasswordChange,
    onPasswordGenerated
}: UserPasswordSectionProps) {
    if (isEdit) {
        return (
            <>
                <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Leave password fields empty to keep the current password
                    </p>
                </div>
                <PasswordInput
                    className="text-sm"
                    id="newPassword"
                    label="New Password (optional)"
                    placeholder="Enter new password or click Generate"
                    showGenerate
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    onPasswordGenerated={onPasswordGenerated}
                />
                <PasswordInput
                    className="text-sm"
                    id="confirmNewPassword"
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => onConfirmPasswordChange(e.target.value)}
                />
            </>
        );
    }

    return (
        <>
            <PasswordInput
                required
                id="password"
                label="Password *"
                placeholder="Enter password (max 128 characters) or click Generate"
                showGenerate
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                onPasswordGenerated={(pwd) => {
                    onPasswordChange(pwd);
                    onConfirmPasswordChange(pwd);
                }}
            />
            <PasswordInput
                required
                id="confirmPassword"
                label="Confirm Password *"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
            />
        </>
    );
}
