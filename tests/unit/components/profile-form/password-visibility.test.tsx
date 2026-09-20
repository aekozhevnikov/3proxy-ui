import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileForm from "@/src/app/admin/profile/components/profile-form";
import { setupMocks, mockCurrentUsername } from "./shared-mocks";
import { mocked, asInputElement } from "@/tests/unit/test-utils/mock-helpers";

describe("ProfileForm password visibility and behavior", () => {
    beforeEach(() => {
        setupMocks();
    });

    it("trims username before submitting", async () => {
        mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ message: "Success" })
        } as never);

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" }
        });

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/auth/change-credentials",
                expect.objectContaining({
                    body: expect.stringContaining('"username":"admin"')
                })
            );
        });
    });

    it("clears form fields on successful update", async () => {
        mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ message: "Profile updated successfully" })
        } as never);

        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("Current Password"), {
            target: { value: "currentpass" }
        });

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        await waitFor(() => {
            const currentPassword = asInputElement(screen.getByLabelText("Current Password"));
            expect(currentPassword.value).toBe("");
        });
    });

    it("toggles current password visibility", () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        const passwordInput = asInputElement(screen.getByLabelText("Current Password"));
        expect(passwordInput.type).toBe("password");

        const toggleButtons = screen.getAllByLabelText("Show password");
        fireEvent.click(toggleButtons[0]);

        expect(passwordInput.type).toBe("text");
    });

    it("toggles new password visibility", () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        const newPasswordInput = asInputElement(screen.getByLabelText("New Password (optional)"));
        expect(newPasswordInput.type).toBe("password");

        const toggleButtons = screen.getAllByLabelText("Show password");
        if (toggleButtons.length >= 2) {
            fireEvent.click(toggleButtons[1]);
        } else {
            fireEvent.click(toggleButtons[0]);
        }

        expect(newPasswordInput.type).not.toBe("password");
    });
});
