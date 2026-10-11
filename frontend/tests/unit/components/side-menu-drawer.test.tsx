import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("next/navigation", () => ({
    usePathname: jest.fn().mockReturnValue("/admin/dashboard"),
    useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock("next/image", () => ({
    __esModule: true,
    default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} src={src || ""} {...props} />,
}));

jest.mock("next-themes", () => ({
    useTheme: () => ({
        theme: "light",
        setTheme: jest.fn(),
    }),
}));

jest.mock("@/src/components/icons", () => ({
    MoonFilledIcon: ({ ...props }: React.SVGProps<SVGSVGElement>) => <svg data-testid="moon-icon" {...props} />,
    SunFilledIcon: ({ ...props }: React.SVGProps<SVGSVGElement>) => <svg data-testid="sun-icon" {...props} />,
    HeartFilledIcon: ({ ...props }: React.SVGProps<SVGSVGElement>) => <svg data-testid="heart-icon" {...props} />,
}));

jest.mock("@/src/components/modals/donation-modal", () => ({
    __esModule: true,
    default: () => <div data-testid="donation-modal" />,
}));

global.fetch = jest.fn();

import SideMenuDrawer from "@/src/components/side-menu-drawer";

describe("SideMenuDrawer", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders hamburger menu button on mobile", () => {
        render(<SideMenuDrawer />);
        const menuButton = screen.getByRole("button");
        expect(menuButton).toBeInTheDocument();
    });

    it("hides drawer initially", () => {
        const { container } = render(<SideMenuDrawer />);
        const drawer = container.querySelector(".fixed.inset-0.bg-black\\/50");
        expect(drawer).not.toBeInTheDocument();
    });

    it("opens drawer when hamburger button clicked", () => {
        render(<SideMenuDrawer />);
        const hamburgerButton = screen.getByRole("button");
        fireEvent.click(hamburgerButton);

        expect(screen.getByText("3proxy UI")).toBeInTheDocument();
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Users")).toBeInTheDocument();
        expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    it("renders theme toggle in drawer", () => {
        render(<SideMenuDrawer />);
        fireEvent.click(screen.getByRole("button"));

        expect(screen.getByLabelText("Toggle theme")).toBeInTheDocument();
    });

    it("renders close button in drawer", () => {
        render(<SideMenuDrawer />);
        fireEvent.click(screen.getByRole("button"));

        const closeButtons = screen.getAllByRole("button");
        expect(closeButtons.length).toBeGreaterThan(1);
    });

    it("renders donation and logout buttons in drawer", () => {
        render(<SideMenuDrawer />);
        fireEvent.click(screen.getByRole("button"));

        expect(screen.getByText("Donation")).toBeInTheDocument();
        // Logout text is present
        const logoutSpan = screen.getAllByText("Logout")[0];
        expect(logoutSpan).toBeInTheDocument();
    });

    it("closes drawer when close button clicked", () => {
        render(<SideMenuDrawer />);
        const hamburger = screen.getByRole("button");
        fireEvent.click(hamburger);

        expect(screen.getByText("Dashboard")).toBeInTheDocument();

        // Find the close (X) button
        const closeButton = screen.getAllByRole("button").find(
            (btn) => btn.querySelector("svg") !== null
        );
        fireEvent.click(closeButton!);
    });

    it("closes drawer when backdrop clicked", () => {
        render(<SideMenuDrawer />);
        const hamburger = screen.getByRole("button");
        fireEvent.click(hamburger);

        expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
});
