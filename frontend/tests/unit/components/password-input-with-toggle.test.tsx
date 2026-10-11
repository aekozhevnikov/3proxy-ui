import { render, screen, fireEvent } from "@testing-library/react";
import PasswordInputWithToggle from "@/src/app/admin/users/components/password-input-with-toggle";
import { asInputElement } from "@/tests/unit/test-utils/mock-helpers";

describe("PasswordInputWithToggle", () => {
    const defaultProps = {
        id: "test-password",
        label: "Password",
        value: "testpass123",
        onChange: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders with correct label and value", () => {
        render(<PasswordInputWithToggle {...defaultProps} />);

        expect(screen.getByLabelText("Password")).toBeInTheDocument();
        expect(screen.getByDisplayValue("testpass123")).toBeInTheDocument();
    });

    it("renders as password type by default", () => {
        render(<PasswordInputWithToggle {...defaultProps} />);

        const input = asInputElement(screen.getByDisplayValue("testpass123"));
        expect(input.type).toBe("password");
    });

    it("toggles password visibility when eye button clicked", () => {
        render(<PasswordInputWithToggle {...defaultProps} />);

        const input = asInputElement(screen.getByDisplayValue("testpass123"));
        expect(input.type).toBe("password");

        const toggleButton = screen.getByRole("button", { name: "Show password" });
        fireEvent.click(toggleButton);

        expect(input.type).toBe("text");
        expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
    });

    it("calls onChange when input value changes", () => {
        render(<PasswordInputWithToggle {...defaultProps} />);

        const input = screen.getByDisplayValue("testpass123");
        fireEvent.change(input, { target: { value: "newpass" } });

        expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    });

    it("applies maxLength attribute when provided", () => {
        render(<PasswordInputWithToggle {...defaultProps} maxLength={64} />);

        const input = asInputElement(screen.getByDisplayValue("testpass123"));
        expect(input.maxLength).toBe(64);
    });

    it("uses default maxLength of 128 when not provided", () => {
        render(<PasswordInputWithToggle {...defaultProps} />);

        const input = asInputElement(screen.getByDisplayValue("testpass123"));
        expect(input.maxLength).toBe(128);
    });

    it("applies custom className when provided", () => {
        render(<PasswordInputWithToggle {...defaultProps} className="custom-class" />);

        const input = screen.getByDisplayValue("testpass123");
        expect(input).toHaveClass("custom-class");
    });

    it("shows required attribute when required is true", () => {
        render(<PasswordInputWithToggle {...defaultProps} required={true} />);

        const input = asInputElement(screen.getByDisplayValue("testpass123"));
        expect(input.required).toBe(true);
    });

    it("shows placeholder when provided", () => {
        render(
            <PasswordInputWithToggle {...defaultProps} placeholder="Enter your password" />
        );

        expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    });
});
