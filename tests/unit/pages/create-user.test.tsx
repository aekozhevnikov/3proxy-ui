import { render, screen } from "@testing-library/react";

jest.mock("@/src/core/auth", () => ({
    requireAdmin: jest.fn(async () => ({ user: { id: 1, username: "admin" }, denial: null })),
    resolveAdmin: jest.fn(async () => ({ id: 1, username: "admin" })),
    assertAdmin: jest.fn(async () => ({ id: 1, username: "admin" }))
}));

jest.mock("@/src/core/actions/proxy-user", () => ({
    createProxyUser: jest.fn()
}));

jest.mock("@/src/core/utils", () => ({
    createPageTitle: (title: string) => `${title} - 3proxy UI`
}));

jest.mock("@/src/app/admin/users/components/user-form", () => {
    return function MockUserForm({ onCreate }: { onCreate: (data: Record<string, unknown>) => void }) {
        return (
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onCreate({ username: "testuser", password: "testpass", isActive: true });
                }}
            >
                <input id="username" placeholder="Enter username (max 64 characters)" />
                <input id="password" placeholder="Enter password" type="password" />
                <button type="submit">Save</button>
            </form>
        );
    };
});

jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

import CreateProxyUserPage from "@/src/app/admin/users/create/page";

describe("CreateProxyUserPage", () => {
    it("resolves to a page for an admin session", async () => {
        const tree = await CreateProxyUserPage();

        expect(tree).toBeTruthy();
        expect((tree as { type?: unknown }).type).toBeTruthy();
    });
});
