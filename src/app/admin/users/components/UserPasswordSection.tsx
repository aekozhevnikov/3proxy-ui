"use client";

import { useState } from "react";

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
    const [showPassword, setShowPassword] = useState(false);

    if (isEdit) {
        return (
            <>
                <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Leave password fields empty to keep the current password
                    </p>
                </div>
                <PasswordInput
                    showGenerate
                    className="text-sm"
                    id="newPassword"
                    label="New Password (optional)"
                    placeholder="Enter new password or click Generate"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    onPasswordGenerated={onPasswordGenerated}
                    showPassword={showPassword}
                    onTogglePassword={setShowPassword}
                />
                <PasswordInput
                    className="text-sm"
                    id="confirmNewPassword"
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => onConfirmPasswordChange(e.target.value)}
                    showPassword={showPassword}
                    onTogglePassword={setShowPassword}
                />
            </>
        );
    }

    return (
        <>
            <PasswordInput
                required
                showGenerate
                id="password"
                label="Password *"
                placeholder="Enter password (max 128 characters) or click Generate"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                onPasswordGenerated={(pwd) => {
                    onPasswordChange(pwd);
                    onConfirmPasswordChange(pwd);
                }}
                showPassword={showPassword}
                onTogglePassword={setShowPassword}
            />
            <PasswordInput
                required
                id="confirmPassword"
                label="Confirm Password *"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                showPassword={showPassword}
                onTogglePassword={setShowPassword}
            />
        </>
    );
}
