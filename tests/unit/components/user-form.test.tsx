import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserForm from "@/src/app/admin/users/components/user-form";
import { ProxyUser } from "@/src/core/definitions";
import { asInputElement } from "@/tests/unit/test-utils/mock-helpers";

jest.mock("@/src/core/toast-utils", () => ({
    showToast: jest.fn(),
}));

jest.mock("@/src/components/custom-date-picker", () => {
    return function MockDatePicker({
        label,
        value,
        onChange,
    }: {
        label: string;
        value: string;
        onChange: (value: string) => void;
    }) {
        return (
            <div>
                <label htmlFor="expiresAt">{label}</label>
                <input
                    id="expiresAt"
                    data-testid="date-picker"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        );
    };
});

describe("UserForm", () => {
    const mockOnCancel = jest.fn();
    const mockOnCreate = jest.fn();
    const mockOnUpdate = jest.fn();

    const baseProps = {
        onCreate: mockOnCreate,
        onCancel: mockOnCancel,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Create mode (no user prop)", () => {
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
            expect(mockOnCancel).toHaveBeenCalled();
        });
    });

    describe("Edit mode (with user prop)", () => {
        const mockUser: ProxyUser = {
            id: 1,
            username: "existinguser",
            password: "hashedpass",
            isActive: true,
            dataLimit: 10240,
            ipLimit: 1,
            expiresAt: null,
            telegramUserId: null,
            dataUsed: 0,
            deactivatedAt: null,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
        };

        const editProps = {
            user: mockUser,
            onUpdate: mockOnUpdate,
            onCancel: mockOnCancel,
        };

        it("renders edit form with existing user data", () => {
            render(<UserForm {...editProps} />);

            const usernameInput = asInputElement(screen.getByPlaceholderText(
                "Enter username (max 64 characters)"
            ));
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

            fireEvent.change(screen.getByPlaceholderText("Enter username (max 64 characters)"), {
                target: { value: "updateduser" },
            });
            fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: 1,
                        username: "updateduser",
                    })
                );
            });
        });

        it("includes password in update data when provided", async () => {
            mockOnUpdate.mockResolvedValue(undefined);
            render(<UserForm {...editProps} onUpdate={mockOnUpdate} />);

            fireEvent.change(screen.getByPlaceholderText("Enter new password or click Generate"), {
                target: { value: "newpass123" },
            });
            fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
                target: { value: "newpass123" },
            });
            fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalledWith(
                    expect.objectContaining({
                        password: "newpass123",
                    })
                );
            });
        });

        it("does not include password in update data when not provided", async () => {
            mockOnUpdate.mockResolvedValue(undefined);
            render(<UserForm {...editProps} onUpdate={mockOnUpdate} />);

            fireEvent.change(screen.getByPlaceholderText("Enter username (max 64 characters)"), {
                target: { value: "updateduser" },
            });
            fireEvent.submit(screen.getByRole("button", { name: /save/i }).closest("form")!);

            await waitFor(() => {
                const callArg = mockOnUpdate.mock.calls[0]?.[0];
                expect(callArg?.password).toBeUndefined();
            });
        });
    });

    describe("Data limit handling", () => {
        it("defaults dataLimit to empty (unlimited)", () => {
            render(<UserForm {...baseProps} />);

            const dataLimitInput = asInputElement(screen.getByLabelText(/data limit/i));
            expect(dataLimitInput.value).toBe("");
        });

        it("defaults ipLimit to 1", () => {
            render(<UserForm {...baseProps} />);

            const ipInput = asInputElement(screen.getByLabelText(/max ip/i));
            expect(ipInput.value).toBe("1");
        });
    });

    describe("Active switch", () => {
        it("defaults to active state (checked)", () => {
            render(<UserForm {...baseProps} />);

            const activeCheckbox = asInputElement(screen.getByRole("switch"));
            expect(activeCheckbox.checked).toBe(true);
        });

        it("can toggle active state", () => {
            render(<UserForm {...baseProps} />);

            const activeCheckbox = screen.getByRole("switch");
            fireEvent.click(activeCheckbox);
            expect(asInputElement(activeCheckbox).checked).toBe(false);
        });
    });

    describe("Telegram user ID", () => {
        it("only allows numeric input", () => {
            render(<UserForm {...baseProps} />);

            const tgInput = screen.getByLabelText(/telegram user id/i);
            fireEvent.change(tgInput, { target: { value: "abc123def456" } });
            expect(asInputElement(tgInput).value).toBe("123456");
        });
    });
});
