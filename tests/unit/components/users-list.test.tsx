import { mocked, mockResponse } from '@/tests/unit/test-utils/mock-helpers';
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import UsersList from "@/src/app/admin/users/components/users-list";
import { ProxyUser } from "@/src/core/definitions";

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

global.fetch = jest.fn();

jest.mock("@/src/core/toast-utils", () => ({
    showToast: jest.fn(),
}));

jest.mock("@/src/core/actions/proxy-user", () => ({
    createProxyUser: jest.fn(),
}));

jest.mock("@heroicons/react/24/outline", () => ({
    ArrowPathIcon: () => <svg data-testid="arrow-path-icon" />,
    ChevronDownIcon: () => <svg data-testid="chevron-down-icon" />,
    FunnelIcon: () => <svg data-testid="funnel-icon" />,
    PencilIcon: () => <svg data-testid="pencil-icon" />,
    PlayIcon: () => <svg data-testid="play-icon" />,
    PlusIcon: () => <svg data-testid="plus-icon" />,
    ShareIcon: () => <svg data-testid="share-icon" />,
    TrashIcon: () => <svg data-testid="trash-icon" />,
}));

jest.mock("lucide-react", () => ({
    Infinity: () => <svg data-testid="infinity-icon" />,
}));

jest.mock("@/src/app/admin/users/components/share-modal", () => {
    return function MockShareModal({ onClose }: { onClose: () => void }) {
        return (
            <div data-testid="share-modal">
                <button onClick={onClose}>Close Share</button>
            </div>
        );
    };
});

jest.mock("@/src/app/admin/users/components/user-form", () => {
    return function MockUserForm({ onCancel, onCreate, onUpdate }: { onCancel: () => void; onCreate?: (data: Record<string, unknown>) => void; onUpdate?: (data: Record<string, unknown>) => void }) {
        return (
            <div data-testid="user-form">
                <button onClick={onCancel}>Cancel</button>
                {onCreate && <button onClick={() => onCreate({ username: "test", password: "pass" })}>Create</button>}
                {onUpdate && <button onClick={() => onUpdate({ id: 1, username: "test" })}>Update</button>}
            </div>
        );
    };
});

jest.mock("@/src/hooks/useUsers", () => ({
    useUsers: ({ initialUsers }: { initialUsers?: ProxyUser[]; fetchEnabled?: boolean }) => ({
        users: initialUsers || [],
        loading: false,
        error: null,
        refetch: jest.fn(),
    }),
}));

jest.mock("@/src/hooks/useUserModals", () => ({
    useUserModals: () => ({
        isCreateModalOpen: false,
        editingUser: null,
        shareUser: null,
        deleteUserId: null,
        openCreateModal: jest.fn(),
        closeCreateModal: jest.fn(),
        openEditModal: jest.fn(),
        closeEditModal: jest.fn(),
        openDeleteModal: jest.fn(),
        closeDeleteModal: jest.fn(),
        openShareModal: jest.fn(),
        closeShareModal: jest.fn(),
    }),
}));

jest.mock("@/src/hooks/useUsersActions", () => ({
    useUsersActions: () => ({
        searchQuery: "",
        setSearchQuery: jest.fn(),
        roleFilter: "all",
        setRoleFilter: jest.fn(),
        statusFilter: "all",
        setStatusFilter: jest.fn(),
        filteredUsers: [],
        handleCreateUser: jest.fn(),
        handleUpdateUser: jest.fn(),
        handleDeleteUser: jest.fn(),
        handleReloadConfig: jest.fn(),
        handleTestProxy: jest.fn(),
        handleOpenEditModalWithFetch: jest.fn(),
        expandedUserIds: new Set<number>(),
        isReloading: false,
        testingUserId: null,
        isDeleting: false,
        toggleExpand: jest.fn(),
        toggleExpandAll: jest.fn(),
    }),
}));

jest.mock("@/src/components/users-list/UserHeader", () => {
    return function MockUserHeader() {
        return <div data-testid="user-header">Header</div>;
    };
});

jest.mock("@/src/components/users-list/UserDesktopTable", () => {
    return function MockUserDesktopTable({ users }: { users: ProxyUser[] }) {
        return <div data-testid="user-desktop-table">{users.map((u) => u.username).join(", ")}</div>;
    };
});

jest.mock("@/src/components/users-list/UserMobileCard", () => {
    return function MockUserMobileCard({ user }: { user: ProxyUser }) {
        return <div data-testid="user-mobile-card">{user.username}</div>;
    };
});

jest.mock("@/src/components/users-list/UserEmptyState", () => {
    return function MockUserEmptyState() {
        return <div data-testid="user-empty-state">No users</div>;
    };
});

jest.mock("@/src/components/users-list/DeleteConfirmModal", () => {
    return function MockDeleteConfirmModal() {
        return <div data-testid="delete-confirm-modal">Delete</div>;
    };
});

jest.mock("@/src/components/users-list/UserModal", () => {
    return function MockUserModal() {
        return <div data-testid="user-modal">Modal</div>;
    };
});

describe("UsersList", () => {
    const mockUsers: ProxyUser[] = [
        {
            id: 1,
            username: "activeuser",
            password: "pass1",
            isActive: true,
            dataLimit: 10240,
            ipLimit: 1,
            expiresAt: null,
            telegramUserId: null,
            dataUsed: 0,
            deactivatedAt: null,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
        },
        {
            id: 2,
            username: "inactiveuser",
            password: "pass2",
            isActive: false,
            dataLimit: 5120,
            ipLimit: 2,
            expiresAt: new Date("2024-06-01"),
            telegramUserId: "123456",
            dataUsed: 0,
            deactivatedAt: new Date("2024-06-01"),
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
        },
        {
            id: 3,
            username: "anotheractive",
            password: "pass3",
            isActive: true,
            dataLimit: null,
            ipLimit: 1,
            expiresAt: null,
            telegramUserId: null,
            dataUsed: 0,
            deactivatedAt: null,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mocked(global.fetch).mockImplementation((input: RequestInfo) => {
            const url = typeof input === "string" ? input : String(input);
            const idMatch = url.match(/\/users\/(\d+)/);
            if (idMatch) {
                const id = Number(idMatch[1]);
                const user = mockUsers.find((u) => u.id === id);
                return Promise.resolve(mockResponse({ success: !!user, user: user ?? null }, { ok: !!user }));
            }

            return Promise.resolve(mockResponse({ success: true, users: mockUsers }));
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("renders users list with initial users when fetchEnabled is false", () => {
        render(<UsersList users={mockUsers} fetchEnabled={false} />);

        expect(screen.getByTestId("user-desktop-table")).toHaveTextContent("activeuser");
        expect(screen.getByTestId("user-desktop-table")).toHaveTextContent("inactiveuser");
        expect(screen.getByTestId("user-desktop-table")).toHaveTextContent("anotheractive");
    });

    it("renders empty state when no users", () => {
        render(<UsersList users={[]} fetchEnabled={false} />);

        expect(screen.getByTestId("user-empty-state")).toBeInTheDocument();
    });
});
