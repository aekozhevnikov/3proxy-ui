import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserForm from "@/src/app/admin/users/components/user-form";
import { setupMocks, baseProps, mockOnCreate } from "./shared-mocks";

const submitForm = () => fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

const fillField = (placeholder: RegExp | string, value: string) =>
    fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

describe("UserForm Create mode", () => {
    beforeEach(() => {
        setupMocks();
    });

    it("renders create form with username, password and confirm password fields", () => {
        render(<UserForm {...baseProps} />);

        expect(screen.getByPlaceholderText("Enter username (max 64 characters)")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument();
    });

    it.each([
        { username: "", expected: "Username is required" },
        { username: "testuser", expected: "Password is required" },
    ])("shows error when $username is missing on submit", async ({ username, expected }) => {
        render(<UserForm {...baseProps} />);

        if (username) {
            fillField("Enter username (max 64 characters)", username);
        }

        submitForm();

        expect(await screen.findByText(expected)).toBeInTheDocument();
    });

    it("shows error when passwords do not match", async () => {
        render(<UserForm {...baseProps} />);

        fillField("Enter username (max 64 characters)", "testuser");
        fillField(/enter password/i, "pass123");
        fillField(/confirm password/i, "pass456");
        submitForm();

        expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    });

    it("calls onCreate with correct data when form is valid", async () => {
        mockOnCreate.mockResolvedValue(undefined);
        render(<UserForm {...baseProps} />);

        fillField("Enter username (max 64 characters)", "newuser");
        fillField(/enter password/i, "password123");
        fillField(/confirm password/i, "password123");
        submitForm();

        await waitFor(() => {
            expect(mockOnCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    username: "newuser",
                    password: "password123",
                    isActive: true,
                })
            );
        });
    });

    it("renders generate password button", () => {
        render(<UserForm {...baseProps} />);
        expect(screen.getByRole("button", { name: /generate secure password/i })).toBeInTheDocument();
    });

    it("calls onCancel when Cancel button clicked", () => {
        render(<UserForm {...baseProps} />);

        const cancelButton = screen.getAllByRole("button").find((btn) => btn.textContent === "Cancel");
        fireEvent.click(cancelButton!);
        expect(baseProps.onCancel).toHaveBeenCalled();
    });

    it("synchronizes password and confirm password visibility toggle", () => {
        render(<UserForm {...baseProps} />);

        const passwordInput = screen.getByPlaceholderText(/enter password/i);
        const confirmPasswordInput = screen.getByPlaceholderText(/confirm password/i);
        const passwordEl = passwordInput as HTMLInputElement;
        const confirmPasswordEl = confirmPasswordInput as HTMLInputElement;

        expect(passwordEl.type).toBe("password");
        expect(confirmPasswordEl.type).toBe("password");

        const toggleButtons = screen.getAllByLabelText(/show password|hide password/i);
        fireEvent.click(toggleButtons[0]);

        expect(passwordEl.type).toBe("text");
        expect(confirmPasswordEl.type).toBe("text");

        fireEvent.click(toggleButtons[0]);

        expect(passwordEl.type).toBe("password");
        expect(confirmPasswordEl.type).toBe("password");
    });
});