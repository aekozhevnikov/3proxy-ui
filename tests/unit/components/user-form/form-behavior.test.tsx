import { render, screen, fireEvent } from "@testing-library/react";
import UserForm from "@/src/app/admin/users/components/user-form";
import { setupMocks, baseProps } from "./shared-mocks";
import { asInputElement } from "@/tests/unit/test-utils/mock-helpers";

describe("UserForm data limit, active switch, and telegram ID", () => {
    beforeEach(() => {
        setupMocks();
    });

    it.each([
        { label: "data limit", expected: "" },
        { label: "max ip", expected: "1" },
    ])("defaults %s input correctly", ({ label, expected }) => {
        render(<UserForm {...baseProps} />);
        const input = asInputElement(screen.getByLabelText(new RegExp(label, "i")));
        expect(input.value).toBe(expected);
    });

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

    it("only allows numeric input for Telegram user ID", () => {
        render(<UserForm {...baseProps} />);
        const tgInput = screen.getByLabelText(/telegram user id/i);
        fireEvent.change(tgInput, { target: { value: "abc123def456" } });
        expect(asInputElement(tgInput).value).toBe("123456");
    });
});