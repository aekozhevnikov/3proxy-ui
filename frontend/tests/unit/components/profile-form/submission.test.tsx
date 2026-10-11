import { mocked, mockResponse } from '@/tests/unit/test-utils/mock-helpers';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileForm from "@/src/app/admin/profile/components/profile-form";
import { setupMocks, mockCurrentUsername } from "./shared-mocks";

describe("ProfileForm submission", () => {
    beforeEach(() => {
        setupMocks();
    });

    it("submits form with username and current password only (no new password)", async () => {
        mocked(global.fetch).mockResolvedValue(mockResponse({ message: "Profile updated successfully" }));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/auth/change-credentials",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: "admin",
                        currentPassword: "currentpass",
                        newPassword: undefined,
                    }),
                })
            );
        });
    });

    it("submits form with new password when provided", async () => {
        mocked(global.fetch).mockResolvedValue(mockResponse({ message: "Profile updated successfully" }));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });
        fireEvent.change(screen.getByLabelText("New Password (optional)"), {
            target: { value: "newpass123" },
        });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), {
            target: { value: "newpass123" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/auth/change-credentials",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({
                        username: "admin",
                        currentPassword: "currentpass",
                        newPassword: "newpass123",
                    }),
                })
            );
        });
    });

    it("shows success message on successful update", async () => {
        mocked(global.fetch).mockResolvedValue(mockResponse({ message: "Profile updated successfully" }));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Profile updated successfully")).toBeInTheDocument();
        });
    });

    it("shows error message on API failure", async () => {
        mocked(global.fetch).mockResolvedValue(mockResponse({ error: "Invalid current password" }, { ok: false }));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "wrongpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Invalid current password")).toBeInTheDocument();
        });
    });

    it("shows error on network failure", async () => {
        mocked(global.fetch).mockRejectedValue(new Error("Network error"));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Network error")).toBeInTheDocument();
        });
    });

    it("disables submit button during submission", async () => {
        let resolveFetch: (value: Response) => void;
        const fetchPromise = new Promise<Response>((resolve) => {
            resolveFetch = resolve;
        });
        mocked(global.fetch).mockReturnValue(fetchPromise);

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);

        await waitFor(() => {
            const submitButton = screen.getByRole("button", { name: /saving/i });
            expect(submitButton).toBeDisabled();
        });

        resolveFetch!(mockResponse({ message: "" }));
    });
});