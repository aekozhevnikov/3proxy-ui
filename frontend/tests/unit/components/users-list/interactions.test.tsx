import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "./component-mocks";

import UsersList from "@/src/app/admin/users/components/users-list";
import { setupMocks, mockUsers } from "./shared-mocks";

describe("UsersList interactions", () => {
    beforeEach(() => {
        setupMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("opens create modal when Add User button clicked", async () => {
        render(<UsersList users={mockUsers} fetchEnabled={false} />);

        const addButton = screen.getByRole("button", { name: /add user/i });
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(screen.getByTestId("user-form")).toBeInTheDocument();
        });
    });

    it("opens edit modal when edit button clicked for a user", async () => {
        render(<UsersList users={mockUsers} fetchEnabled={false} />);

        const editButtons = screen.getAllByTestId("pencil-icon");
        fireEvent.click(editButtons[0].closest("button")!);

        await waitFor(() => {
            expect(screen.getByTestId("user-form")).toBeInTheDocument();
        });
    });

    it("calls fetch API on initial mount when fetchEnabled", async () => {
        render(<UsersList fetchEnabled={true} />);

        expect(global.fetch).toHaveBeenCalledWith("/api/admin/users");
    });

    it("sets up polling interval when fetchEnabled is true", async () => {
        jest.useFakeTimers();
        render(<UsersList fetchEnabled={true} />);

        expect(global.fetch).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(5000);
        expect(global.fetch).toHaveBeenCalledTimes(2);

        jest.useRealTimers();
    });

    it("shows reload button and calls config reload API", async () => {
        render(<UsersList users={mockUsers} fetchEnabled={false} />);

        const reloadButton = screen.getByRole("button", { name: /reload/i });
        fireEvent.click(reloadButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/config/reload",
                expect.objectContaining({ method: "POST" })
            );
        });
    });

    it("handles test proxy button click", async () => {
        render(<UsersList users={mockUsers} fetchEnabled={false} />);

        const testButtons = screen.getAllByTestId("play-icon");
        if (testButtons.length > 0) {
            fireEvent.click(testButtons[0].closest("button")!);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/admin/users/test-proxy",
                    expect.objectContaining({ method: "POST" })
                );
            });
        }
    });
});