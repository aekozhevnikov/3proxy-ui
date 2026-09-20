// Jest component mocks for UsersList tests
// Must be imported BEFORE any component that uses these modules

import React from "react";

jest.mock("@/src/app/admin/users/components/user-form", () => {
    return function MockUserForm({ onCancel, onCreate, onUpdate }: { onCancel: () => void; onCreate: (data: Record<string, unknown>) => void; onUpdate: (data: Record<string, unknown>) => void }) {
        return (
            <div data-testid="user-form">
                <button onClick={onCancel}>Cancel</button>
                {onCreate && <button onClick={() => onCreate({ username: "test", password: "pass" })}>Create</button>}
                {onUpdate && <button onClick={() => onUpdate({ id: 1, username: "test" })}>Update</button>}
            </div>
        );
    };
});

jest.mock("@/src/app/admin/users/components/share-modal", () => {
    return function MockShareModal({ onClose }: { onClose: () => void }) {
        return (
            <div data-testid="share-modal">
                <button onClick={onClose}>Close Share</button>
            </div>
        );
    };
});