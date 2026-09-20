"use client";

import UserForm from "@/src/app/admin/users/components/user-form";
import { ProxyUser, NewProxyUserRequest, EditProxyUserRequest } from "@/src/core/definitions";

interface UserModalProps {
    user?: ProxyUser;
    title: string;
    description: string;
    isOpen: boolean;
    onClose: () => void;
    onCancel?: () => void;
    onCreate?: (data: NewProxyUserRequest) => Promise<ProxyUser | void>;
    onUpdate?: (data: EditProxyUserRequest) => Promise<ProxyUser | void>;
}

export default function UserModal({
    user,
    title,
    description,
    isOpen,
    onClose,
    onCreate,
    onUpdate
}: UserModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                </div>
                <div className="p-6">
                    <UserForm
                        user={user}
                        onCancel={onClose}
                        onCreate={onCreate}
                        onUpdate={onUpdate}
                    />
                </div>
            </div>
        </div>
    );
}
