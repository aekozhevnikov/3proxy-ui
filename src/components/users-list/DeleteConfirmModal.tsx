"use client";

interface DeleteConfirmModalProps {
    userId: number | null;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => Promise<void>;
}

export default function DeleteConfirmModal({ userId, isDeleting, onCancel, onConfirm }: DeleteConfirmModalProps) {
    if (!userId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete User</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Are you sure you want to delete this user? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm rounded-full transition-colors"
                        disabled={isDeleting}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 hover:shadow-md rounded-full transition-colors disabled:opacity-50"
                        disabled={isDeleting}
                        onClick={onConfirm}
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
