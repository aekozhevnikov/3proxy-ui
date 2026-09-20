import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("@heroicons/react/24/outline", () => ({
    XMarkIcon: ({ ...props }: React.SVGProps<SVGSVGElement>) => <svg data-testid="xmark-icon" {...props} />,
}));

jest.mock("@react-aria/interactions", () => ({
    usePress: () => ({
        pressProps: {},
    }),
}));

jest.mock("@/src/hooks/use-qr-code", () => ({
    __esModule: true,
    default: jest.fn(() => jest.fn()),
}));

jest.mock("@/src/core/config", () => ({
    donationAddresses: {
        BTC: "bc1q6ghwetuv60tug74yr4dm48hjw8w5w2cenvan6x",
        USDT: "TGoWzFXR7FewW1S9XfD7wc1tAjpTWx4g8Q",
        ETH: "0x32318f9fc771353b2fEF73B65Bc4684fB9285D78",
        TON: "UQDlS4rygl8h0pZDBXHbPCD5sf2TUU4ZaxbcnjTORd3AqDyi",
    },
}));

const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(global.navigator, "clipboard", {
    value: { writeText: mockWriteText },
    configurable: true,
});

import DonationModal from "@/src/components/modals/donation-modal";

describe("DonationModal", () => {
    const mockOnOpenChange = jest.fn();

    const baseProps = {
        disclosure: {
            isOpen: true,
            onOpenChange: mockOnOpenChange,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockWriteText.mockClear();
        mockWriteText.mockResolvedValue(undefined);
    });

    it("renders when open", () => {
        render(<DonationModal {...baseProps} />);
        expect(screen.getByText("Donation")).toBeInTheDocument();
    });

    it("renders donation description", () => {
        render(<DonationModal {...baseProps} />);
        expect(screen.getByText(/make a donation/i)).toBeInTheDocument();
    });

    it("renders donation entries for each configured currency", () => {
        render(<DonationModal {...baseProps} />);
        expect(screen.getByText("BTC")).toBeInTheDocument();
        expect(screen.getByText("USDT")).toBeInTheDocument();
        expect(screen.getByText("ETH")).toBeInTheDocument();
        expect(screen.getByText("TON")).toBeInTheDocument();
    });

    it("renders close button", () => {
        render(<DonationModal {...baseProps} />);
        expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    });

    it("calls onOpenChange(false) when close button clicked", () => {
        render(<DonationModal {...baseProps} />);
        // The "Close" button in the footer calls disclosure.onOpenChange(false)
        const closeButton = screen.getByRole("button", { name: /close/i });
        fireEvent.click(closeButton);
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("renders copy buttons for each currency", () => {
        render(<DonationModal {...baseProps} />);
        // The copy buttons show ⧉ or ✓
        const copyButtons = screen.getAllByRole("button").filter(
            (btn) => btn.textContent?.includes("⧉") || btn.textContent?.includes("✓")
        );
        expect(copyButtons.length).toBeGreaterThan(0);
    });

    it("copies address to clipboard when copy button clicked", async () => {
        render(<DonationModal {...baseProps} />);

        // Find copy buttons - they have ⧉ content
        const copyButtons = screen.getAllByRole("button").filter(
            (btn) => btn.textContent?.includes("⧉")
        );
        expect(copyButtons.length).toBeGreaterThan(0);

        fireEvent.click(copyButtons[0]);

        await waitFor(() => {
            expect(mockWriteText).toHaveBeenCalled();
        });
    });
});
