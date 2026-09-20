import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { mockResponse } from "@/tests/unit/test-utils/mock-helpers";
import ProfileForm from "@/src/app/admin/profile/components/profile-form";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
}));

jest.mock("@/src/app/admin/profile/components/PasswordChangeSection", () => {
    return function MockPasswordChangeSection({
        currentPassword,
        newPassword,
        confirmPassword,
        onCurrentPasswordChange,
        onNewPasswordChange,
        onConfirmPasswordChange
    }: {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
        onCurrentPasswordChange: (value: string) => void;
        onNewPasswordChange: (value: string) => void;
        onConfirmPasswordChange: (value: string) => void;
    }) {
        return (
            <div data-testid="password-change-section">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => onCurrentPasswordChange(e.target.value)}
                />
                <label htmlFor="newPassword">New Password (optional)</label>
                <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => onNewPasswordChange(e.target.value)}
                />
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => onConfirmPasswordChange(e.target.value)}
                />
            </div>
        );
    };
});

describe("ProfileForm", () => {
    const mockCurrentUsername = "admin";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders with current username pre-filled", () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        const usernameInput = screen.getByLabelText("Username") as HTMLInputElement;
        expect(usernameInput.value).toBe("admin");
    });

    it("renders current password and new password fields", () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });

    it("renders submit button", () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    it("shows error when new passwords do not match", async () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        const currentPasswordInput = screen.getByLabelText("Current Password") as HTMLInputElement;
        const newPasswordInput = screen.getByLabelText("New Password (optional)") as HTMLInputElement;
        const confirmPasswordInput = screen.getByLabelText("Confirm New Password") as HTMLInputElement;

        fireEvent.change(currentPasswordInput, {
            target: { value: "currentpass" },
        });
        fireEvent.change(newPasswordInput, {
            target: { value: "newpass123" },
        });
        fireEvent.change(confirmPasswordInput, {
            target: { value: "different123" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);

        expect(await screen.findByText("New passwords do not match")).toBeInTheDocument();
    });

    it("submits form with username and current password only (no new password)", async () => {
        mockFetch.mockResolvedValue(mockResponse({ message: "Profile updated successfully" }));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
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
        mockFetch.mockResolvedValue(mockResponse({ message: "Profile updated successfully" }));

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

        fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
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
        mockFetch.mockResolvedValue(mockResponse({ message: "Profile updated successfully" }));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Profile updated successfully")).toBeInTheDocument();
        });
    });

    it("shows error on failed update", async () => {
        mockFetch.mockResolvedValue(mockResponse({ error: "Invalid current password" }, { ok: false }));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "wrongpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Invalid current password")).toBeInTheDocument();
        });
    });

    it("shows error on network error", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Network error")).toBeInTheDocument();
        });
    });

    it("trims username before submitting", async () => {
        mockFetch.mockResolvedValue(mockResponse({ message: "Success" }));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                "/api/auth/change-credentials",
                expect.objectContaining({
                    body: expect.stringContaining('"username":"admin"'),
                })
            );
        });
    });

    it("clears form fields on successful update", async () => {
        mockFetch.mockResolvedValue(mockResponse({ message: "Profile updated successfully" }));

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save changes/i }).closest("form")!);

        await waitFor(() => {
            const currentPassword = screen.getByLabelText("Current Password") as HTMLInputElement;
            expect(currentPassword.value).toBe("");
        });
    });
});
