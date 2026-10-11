import { render, screen } from "@testing-library/react";
import ProfileForm from "@/src/app/admin/profile/components/profile-form";
import { setupMocks, mockCurrentUsername } from "./shared-mocks";
import { asInputElement } from "@/tests/unit/test-utils/mock-helpers";

describe("ProfileForm rendering", () => {
    beforeEach(() => {
        setupMocks();
    });

    it("renders with current username pre-filled", () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        const usernameInput = asInputElement(screen.getByLabelText("Username"));
        expect(usernameInput.value).toBe("admin");
    });

    it("renders current password and new password fields", () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        expect(screen.getByLabelText("Username")).toBeInTheDocument();
        expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
        expect(screen.getByLabelText("New Password (optional)")).toBeInTheDocument();
        expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
    });

    it("renders submit button", () => {
        render(<ProfileForm currentUsername={mockCurrentUsername} />);

        expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
});