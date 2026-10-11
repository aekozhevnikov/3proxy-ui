import { mocked, mockResponse } from '@/tests/unit/test-utils/mock-helpers';
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("next/navigation", () => ({
    usePathname: jest.fn().mockReturnValue("/admin/dashboard"),
    useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock("next/image", () => ({
    __esModule: true,
    default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} src={src || ""} {...props} />,
}));

const mockSetTheme = jest.fn();
jest.mock("next-themes", () => ({
    useTheme: () => ({
        theme: "light",
        setTheme: mockSetTheme,
    }),
}));

jest.mock("@/src/components/icons", () => ({
    HeartFilledIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="heart-icon" {...props} />,
    MoonFilledIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="moon-icon" {...props} />,
    SunFilledIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="sun-icon" {...props} />,
}));

jest.mock("@/src/components/modals/donation-modal", () => ({
    __esModule: true,
    default: ({ disclosure }: { disclosure: { isOpen: boolean } }) => (
        <div data-testid="donation-modal">
            {disclosure.isOpen && <span>Donation Modal Open</span>}
        </div>
    ),
}));

global.fetch = jest.fn();

import SideMenu from "@/src/components/side-menu";

describe("SideMenu", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mocked(global.fetch).mockResolvedValue(mockResponse({ success: true }));
    });

    it("renders brand name and logo", () => {
        render(<SideMenu />);
        expect(screen.getByText("3proxy UI")).toBeInTheDocument();
        expect(screen.getByAltText("3proxy")).toBeInTheDocument();
    });

    it("renders navigation links", () => {
        render(<SideMenu />);
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Users")).toBeInTheDocument();
        expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    it("renders donation button", () => {
        render(<SideMenu />);
        expect(screen.getByLabelText("Donation")).toBeInTheDocument();
    });

    it("renders theme toggle button", () => {
        render(<SideMenu />);
        expect(screen.getByLabelText("Toggle theme")).toBeInTheDocument();
    });

    it("renders logout button", () => {
        render(<SideMenu />);
        expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    });

    it("calls fetch on logout", async () => {
        render(<SideMenu />);
        fireEvent.click(screen.getByRole("button", { name: /logout/i }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
        });
    });

    it("logs console error on logout failure", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();
        mocked(global.fetch).mockRejectedValue(new Error("Network error"));

        render(<SideMenu />);
        fireEvent.click(screen.getByRole("button", { name: /logout/i }));

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });

        consoleSpy.mockRestore();
    });

    it("highlights active navigation link", () => {
        render(<SideMenu />);
        const dashboardLink = screen.getByText("Dashboard").closest("a");
        expect(dashboardLink).toHaveClass("bg-blue-50");
        expect(dashboardLink).toHaveClass("text-blue-600");
    });

    it("renders donation modal component", () => {
        render(<SideMenu />);
        expect(screen.getByTestId("donation-modal")).toBeInTheDocument();
    });

    it("toggles theme when theme button clicked", () => {
        render(<SideMenu />);
        const toggleButton = screen.getByLabelText("Toggle theme");
        fireEvent.click(toggleButton);
        expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
});
