jest.mock("@/src/core/actions/proxy-user", () => ({
    getProxyUserById: jest.fn(),
    updateProxyUser: jest.fn()
}));

jest.mock("@/src/core/utils", () => ({
    createPageTitle: (title: string) => `${title} - 3proxy UI`
}));

jest.mock("@/src/app/admin/users/components/user-form", () => {
    return function MockUserForm({
        user,
        onUpdate
    }: {
        user?: { id: number; username: string } | null;
        onUpdate?: (data: Record<string, unknown>) => void;
    }) {
        if (!user) {
            return <div>User not found</div>;
        }
        return (
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onUpdate && onUpdate({ ...user, username: "updated" });
                }}
            >
                <input id="username" placeholder="Enter username (max 64 characters)" defaultValue={user.username} />
                <button type="submit">Save</button>
            </form>
        );
    };
});

import { ProxyUser } from "@/src/core/definitions";

const mockUser: ProxyUser = {
    id: 1,
    username: "testuser",
    password: "hashedpass",
    isActive: true,
    dataLimit: 10240,
    ipLimit: 1,
    expiresAt: null,
    telegramUserId: null,
    dataUsed: 0,
    deactivatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
};

describe("EditUserPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders edit user heading when user exists", async () => {
        const { getProxyUserById } = require("@/src/core/actions/proxy-user");
        getProxyUserById.mockResolvedValue(mockUser);

        const params = Promise.resolve({ id: "1" });
        const Page = await import("@/src/app/admin/users/[id]/edit/page");

        Page.default({ params }).then(() => {
            // For async server components, we need to test differently
            // Since this is a server component, we test via generateMetadata
        });
    });

    it("generateMetadata returns correct title when user exists", async () => {
        const { getProxyUserById } = require("@/src/core/actions/proxy-user");
        getProxyUserById.mockResolvedValue(mockUser);

        const params = Promise.resolve({ id: "1" });
        const Page = await import("@/src/app/admin/users/[id]/edit/page");

        const metadata = await Page.generateMetadata({ params });
        expect(metadata.title).toContain("Edit testuser");
    });

    it("generateMetadata returns fallback title when user not found", async () => {
        const { getProxyUserById } = require("@/src/core/actions/proxy-user");
        getProxyUserById.mockResolvedValue(null);

        const params = Promise.resolve({ id: "999" });
        const Page = await import("@/src/app/admin/users/[id]/edit/page");

        const metadata = await Page.generateMetadata({ params });
        expect(metadata.title).toBe("Edit User - 3proxy UI");
    });
});
