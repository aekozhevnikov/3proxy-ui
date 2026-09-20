import { render, screen, waitFor, fireEvent } from "@testing-library/react";

jest.mock("@heroicons/react/24/outline", () => ({
    XMarkIcon: ({ ...props }: React.SVGProps<SVGSVGElement>) => <svg data-testid="xmark-icon" {...props} />,
    CheckIcon: ({ ...props }: React.SVGProps<SVGSVGElement>) => <svg data-testid="check-icon" {...props} />,
    ClipboardIcon: ({ ...props }: React.SVGProps<SVGSVGElement>) => <svg data-testid="clipboard-icon" {...props} />
}));

jest.mock("@/src/core/toast-utils", () => ({
    showToast: jest.fn()
}));

jest.mock("@/src/core/proxy-config", () => ({
    generateHttpConfig: jest.fn().mockResolvedValue("http://user:pass@localhost:1234"),
    generateHttpsConfig: jest.fn().mockResolvedValue("https://user:pass@localhost:1234"),
    generateSocksConfig: jest.fn().mockResolvedValue("socks5://user:pass@localhost:1234")
}));

const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(global.navigator, "clipboard", {
    value: { writeText: mockWriteText },
    configurable: true
});

import ShareModal from "@/src/app/admin/users/components/share-modal";

describe("ShareModal", () => {
    const mockOnClose = jest.fn();

    const baseProps = {
        username: "testuser",
        password: "testpass123",
        isOpen: true,
        onClose: mockOnClose
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockWriteText.mockClear();
        mockWriteText.mockResolvedValue(undefined);
    });

    it("renders nothing when not open", () => {
        const { container } = render(<ShareModal {...baseProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders modal when open", () => {
        render(<ShareModal {...baseProps} />);
        expect(screen.getByText("Share Proxy Configuration")).toBeInTheDocument();
    });

    it("renders all three configuration sections", () => {
        render(<ShareModal {...baseProps} />);
        expect(screen.getByText("HTTPS Configuration")).toBeInTheDocument();
        expect(screen.getByText("HTTP Configuration")).toBeInTheDocument();
        expect(screen.getByText("SOCKS5 Configuration")).toBeInTheDocument();
    });

    it("renders close button", () => {
        render(<ShareModal {...baseProps} />);
        expect(screen.getByTestId("xmark-icon").closest("button")).toBeInTheDocument();
    });

    it("calls onClose when close button clicked", () => {
        render(<ShareModal {...baseProps} />);
        const closeButton = screen.getByTestId("xmark-icon").closest("button")!;
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("generates config links on open", async () => {
        const { generateHttpsConfig, generateHttpConfig, generateSocksConfig } = require("@/src/core/proxy-config");

        render(<ShareModal {...baseProps} />);

        await waitFor(() => {
            expect(generateHttpsConfig).toHaveBeenCalledWith("testuser", "testpass123");
            expect(generateHttpConfig).toHaveBeenCalledWith("testuser", "testpass123");
            expect(generateSocksConfig).toHaveBeenCalledWith("testuser", "testpass123");
        });
    });

    it("copies link to clipboard when copy button clicked", async () => {
        render(<ShareModal {...baseProps} />);

        await waitFor(() => {
            expect(screen.getByText("HTTPS Configuration")).toBeInTheDocument();
        });

        const copyButtons = screen.getAllByTestId("clipboard-icon");
        fireEvent.click(copyButtons[0].closest("button")!);

        await waitFor(() => {
            expect(mockWriteText).toHaveBeenCalledWith("https://user:pass@localhost:1234");
        });
    });

    it("shows checkmark after copying", async () => {
        render(<ShareModal {...baseProps} />);

        await waitFor(() => {
            expect(screen.getByText("HTTPS Configuration")).toBeInTheDocument();
        });

        const copyButton = screen
            .getAllByRole("button")
            .find((btn) => btn.querySelector("svg") !== null && !btn.closest(".sticky"));
        fireEvent.click(copyButton!);

        await waitFor(() => {
            expect(screen.getAllByTestId("check-icon").length).toBeGreaterThan(0);
        });
    });

    it("closes modal on outside click", () => {
        const { container } = render(<ShareModal {...baseProps} />);
        fireEvent.mouseDown(container);
        expect(mockOnClose).toHaveBeenCalled();
    });
});
