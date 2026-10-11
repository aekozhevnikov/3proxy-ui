import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { asInputElement } from "@/tests/unit/test-utils/mock-helpers";
import UserForm from "@/src/app/admin/users/components/user-form";
import { setupMocks, editProps, mockOnUpdate } from "./shared-mocks";

const fillField = (placeholder: RegExp | string, value: string) =>
    fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

const submitForm = () => fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

describe("UserForm Edit mode", () => {
    beforeEach(() => {
        setupMocks();
    });

    it("renders edit form with existing user data", () => {
        render(<UserForm {...editProps} />);
        const usernameInput = asInputElement(screen.getByPlaceholderText("Enter username (max 64 characters)"));
        expect(usernameInput.value).toBe("existinguser");
    });

    it("shows new password fields (optional) in edit mode", () => {
        render(<UserForm {...editProps} />);
        expect(screen.getByPlaceholderText("Enter new password or click Generate")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Confirm new password")).toBeInTheDocument();
    });

    it("calls onUpdate with correct data when editing user", async () => {
        mockOnUpdate.mockResolvedValue(undefined);
        render(<UserForm {...editProps} onUpdate={mockOnUpdate} />);

        fillField("Enter username (max 64 characters)", "updateduser");
        submitForm();

        await waitFor(() => {
            expect(mockOnUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1, username: "updateduser" })
            );
        });
    });

    it("includes password in update data when provided", async () => {
        mockOnUpdate.mockResolvedValue(undefined);
        render(<UserForm {...editProps} onUpdate={mockOnUpdate} />);

        fillField("Enter new password or click Generate", "newpass123");
        fillField("Confirm new password", "newpass123");
        submitForm();

        await waitFor(() => {
            expect(mockOnUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ password: "newpass123" })
            );
        });
    });

    it("does not include password in update data when not provided", async () => {
        mockOnUpdate.mockResolvedValue(undefined);
        render(<UserForm {...editProps} onUpdate={mockOnUpdate} />);

        fillField("Enter username (max 64 characters)", "updateduser");
        submitForm();

        await waitFor(() => {
            const callArg = mockOnUpdate.mock.calls[0][0];
            expect(callArg.password).toBeUndefined();
        });
    });
});