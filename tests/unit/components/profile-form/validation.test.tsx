import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileForm from "@/src/app/admin/profile/components/profile-form";
import { setupMocks, mockCurrentUsername } from "./shared-mocks";

describe("ProfileForm validation", () => {
    beforeEach(() => {
        setupMocks();
    });

    it("shows error when new passwords do not match", async () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("New Password (optional)"), {
            target: { value: "newpass123" },
        });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), {
            target: { value: "different123" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        expect(await screen.findByText("New passwords do not match")).toBeInTheDocument();
    });

    it("shows error when new password is less than 8 characters", async () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        fireEvent.change(screen.getByLabelText("New Password (optional)"), {
            target: { value: "short" },
        });
        fireEvent.change(screen.getByLabelText("Confirm New Password"), {
            target: { value: "short" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        expect(
            await screen.findByText("New password must be at least 8 characters")
        ).toBeInTheDocument();
    });
});