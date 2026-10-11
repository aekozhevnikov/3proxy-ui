import { render, screen, waitFor } from "@testing-library/react";
import UsersList from "@/src/app/admin/users/components/users-list";
import { setupMocks, mockUsers } from "./shared-mocks";

describe("UsersList rendering", () => {
    beforeEach(() => {
        setupMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("renders users list with initial users when fetchEnabled is false", () => {
        render(<UsersList users={mockUsers} fetchEnabled={false} />);

        expect(screen.getAllByText("activeuser").length).toBeGreaterThan(0);
        expect(screen.getAllByText("inactiveuser").length).toBeGreaterThan(0);
        expect(screen.getAllByText("anotheractive").length).toBeGreaterThan(0);
    });

    it("fetches users from API when fetchEnabled is true", async () => {
        render(<UsersList fetchEnabled={true} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/admin/users");
        });

        await waitFor(() => {
            expect(screen.getAllByText("activeuser").length).toBeGreaterThan(0);
        });
    });

    it("filters to show only active users when statusFilter is active", async () => {
        render(<UsersList users={mockUsers} fetchEnabled={false} />);

        const activeUsers = await screen.findAllByText("activeuser");
        const inactiveUsers = await screen.findAllByText("inactiveuser");
        const anotherActive = await screen.findAllByText("anotheractive");

        expect(activeUsers.length).toBeGreaterThan(0);
        expect(inactiveUsers.length).toBeGreaterThan(0);
        expect(anotherActive.length).toBeGreaterThan(0);
    });

    it("filters to show only deactivated users when statusFilter is deactivated", async () => {
        render(<UsersList users={mockUsers} fetchEnabled={false} />);

        expect(screen.getAllByText("inactiveuser").length).toBeGreaterThan(0);
    });

    it("shows all users when statusFilter is all", async () => {
        render(<UsersList users={mockUsers} fetchEnabled={false} />);

        expect(screen.getAllByText("activeuser").length).toBeGreaterThan(0);
        expect(screen.getAllByText("inactiveuser").length).toBeGreaterThan(0);
        expect(screen.getAllByText("anotheractive").length).toBeGreaterThan(0);
    });
});