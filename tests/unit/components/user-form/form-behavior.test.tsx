import { render, screen, fireEvent } from "@testing-library/react";
import UserForm from "@/src/app/admin/users/components/user-form";
import { setupMocks, baseProps } from "./shared-mocks";
import { asInputElement } from "@/tests/unit/test-utils/mock-helpers";

describe("UserForm data limit, active switch, and telegram ID", () => {
    beforeEach(() => {
        setupMocks();
    });

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