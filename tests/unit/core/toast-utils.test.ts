import { showToast } from "@/src/core/toast-utils";
import { toast } from "react-toastify";

jest.mock("react-toastify", () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
    },
}));

describe("showToast", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("calls toast.success for success type", () => {
        showToast("Success message", "success");
        expect(toast.success).toHaveBeenCalledWith(
            "Success message",
            expect.objectContaining({
                position: "top-center",
                autoClose: 2000,
            })
        );
    });

    it("calls toast.error for error type", () => {
        showToast("Error message", "error");
        expect(toast.error).toHaveBeenCalledWith(
            "Error message",
            expect.objectContaining({
                position: "top-center",
            })
        );
    });

    it("calls toast.warning for warning type", () => {
        showToast("Warning message", "warning");
        expect(toast.warning).toHaveBeenCalledWith(
            "Warning message",
            expect.objectContaining({
                position: "top-center",
            })
        );
    });

    it("calls toast.info for info type", () => {
        showToast("Info message", "info");
        expect(toast.info).toHaveBeenCalledWith(
            "Info message",
            expect.objectContaining({
                position: "top-center",
            })
        );
    });

    it("defaults to success type when no type provided", () => {
        showToast("Default message");
        expect(toast.success).toHaveBeenCalledWith(
            "Default message",
            expect.any(Object)
        );
    });

    it("passes options with correct styles", () => {
        showToast("Test", "success");
        expect(toast.success).toHaveBeenCalledWith(
            "Test",
            expect.objectContaining({
                theme: "colored",
                style: expect.objectContaining({
                    minHeight: "32px",
                    maxHeight: "100px",
                    width: "fit-content",
                    borderRadius: "50px",
                }),
            })
        );
    });
});
