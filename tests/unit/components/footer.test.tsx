import { render, screen } from "@testing-library/react";

import Footer from "@/src/components/footer";
import { asHtmlElement } from "@/tests/unit/test-utils/mock-helpers";

describe("Footer", () => {
    it("renders GitHub link with correct href", () => {
        render(<Footer />);
        const githubLink = screen.getByLabelText("GitHub");
        expect(githubLink).toHaveAttribute("href", "https://github.com/aekozhevnikov");
        expect(githubLink).toHaveAttribute("target", "_blank");
        expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders Telegram link with correct href", () => {
        render(<Footer />);
        const telegramLink = screen.getByLabelText("Telegram");
        expect(telegramLink).toHaveAttribute("href", "https://t.me/dev_ghost_dev");
        expect(telegramLink).toHaveAttribute("target", "_blank");
    });

    it("renders GitHub SVG icon", () => {
        const { container } = render(<Footer />);
        const githubSvg = container.querySelector("svg");
        expect(githubSvg).toBeInTheDocument();
    });

    it("renders donation text with heart icon", () => {
        render(<Footer />);
        expect(screen.getByText("made for free internet with")).toBeInTheDocument();
        const heartIcon = screen.getByLabelText("heart");
        expect(heartIcon).toBeInTheDocument();
    });

    it("renders copyright with current year", () => {
        render(<Footer />);
        const year = new Date().getFullYear();
        expect(screen.getByText(`© ${year} 3proxy UI. All rights reserved.`)).toBeInTheDocument();
    });

    it("renders with correct container styling", () => {
        const { container } = render(<Footer />);
        const footer = asHtmlElement(container.firstChild);
        expect(footer.tagName).toBe("FOOTER");
        expect(footer).toHaveClass("py-4");
        expect(footer).toHaveClass("px-6");
    });
});
