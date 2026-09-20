import { render, screen } from "@testing-library/react";

jest.mock("@/src/core/actions/proxy-user", () => ({
    createProxyUser: jest.fn(),
}));

jest.mock("@/src/core/utils", () => ({
    createPageTitle: (title: string) => `${title} - 3proxy UI`,
}));

jest.mock("@/src/app/admin/users/components/user-form", () => {
    return function MockUserForm({ onCreate }: { onCreate: (data: Record<string, unknown>) => void }) {
        return (
            <form onSubmit={(e) => { e.preventDefault(); onCreate({ username: "testuser", password: "testpass", isActive: true }); }}>
                <input id="username" placeholder="Enter username (max 64 characters)" />
                <input id="password" placeholder="Enter password" type="password" />
                <button type="submit">Save</button>
            </form>
        );
    };
});

import CreateProxyUserPage from "@/src/app/admin/users/create/page";

describe("CreateProxyUserPage", () => {
    it("renders create user heading", () => {
        render(<CreateProxyUserPage />);
        expect(screen.getByText("Create Proxy User")).toBeInTheDocument();
    });

    it("renders UserForm component", () => {
        render(<CreateProxyUserPage />);
        expect(screen.getByPlaceholderText("Enter username (max 64 characters)")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    });

    it("renders save button", () => {
        render(<CreateProxyUserPage />);
        expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });

    it("renders with correct page layout", () => {
        const { container } = render(<CreateProxyUserPage />);
        expect(container.querySelector(".container")).toBeInTheDocument();
        expect(container.querySelector(".max-w-2xl")).toBeInTheDocument();
    });
});
