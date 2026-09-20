import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserForm from "@/src/app/admin/users/components/user-form";
import { setupMocks, baseProps, mockOnCreate } from "./shared-mocks";

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

    it("shows error when username is empty on submit", async () => {
        render(<UserForm {...baseProps} />);

        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        expect(await screen.findByText("Username is required")).toBeInTheDocument();
    });

    it("shows error when password is empty on submit", async () => {
        render(<UserForm {...baseProps} />);

        fireEvent.change(screen.getByPlaceholderText("Enter username (max 64 characters)"), {
            target: { value: "testuser" },
        });
        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        expect(await screen.findByText("Password is required")).toBeInTheDocument();
    });

    it("shows error when passwords do not match", async () => {
        render(<UserForm {...baseProps} />);

        fireEvent.change(screen.getByPlaceholderText("Enter username (max 64 characters)"), {
            target: { value: "testuser" },
        });
        fireEvent.change(screen.getByPlaceholderText(/enter password/i), {
            target: { value: "pass123" },
        });
        fireEvent.change(screen.getByPlaceholderText(/confirm password/i), {
            target: { value: "pass456" },
        });
        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

        expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    });

    it("calls onCreate with correct data when form is valid", async () => {
        mockOnCreate.mockResolvedValue(undefined);
        render(<UserForm {...baseProps} />);

        fireEvent.change(screen.getByPlaceholderText("Enter username (max 64 characters)"), {
            target: { value: "newuser" },
        });
        fireEvent.change(screen.getByPlaceholderText(/enter password/i), {
            target: { value: "password123" },
        });
        fireEvent.change(screen.getByPlaceholderText(/confirm password/i), {
            target: { value: "password123" },
        });
        fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

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

        expect(
            screen.getByRole("button", { name: /generate secure password/i })
        ).toBeInTheDocument();
    });

    it("calls onCancel when Cancel button clicked", () => {
        render(<UserForm {...baseProps} />);

        const buttons = screen.getAllByRole("button");
        const cancelButton = buttons.find((btn) => btn.textContent === "Cancel");
        fireEvent.click(cancelButton!);
        expect(baseProps.onCancel).toHaveBeenCalled();
    });
});