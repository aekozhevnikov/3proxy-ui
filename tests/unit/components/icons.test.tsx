import { render } from "@testing-library/react";

import {
    MoonFilledIcon,
    CopyIcon,
    HeartFilledIcon,
    HeartIconDuotone,
    SunFilledIcon,
} from "@/src/components/icons";

describe("Icons", () => {
    describe("MoonFilledIcon", () => {
        it("renders an SVG element", () => {
            const { container } = render(<MoonFilledIcon />);
            expect(container.querySelector("svg")).toBeInTheDocument();
        });

        it("uses default size of 24", () => {
            const { container } = render(<MoonFilledIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveAttribute("height", "24");
            expect(svg).toHaveAttribute("width", "24");
        });

        it("uses custom size when provided", () => {
            const { container } = render(<MoonFilledIcon size={32} />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveAttribute("height", "32");
            expect(svg).toHaveAttribute("width", "32");
        });

        it("applies custom className", () => {
            const { container } = render(<MoonFilledIcon className="custom-class" />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveClass("custom-class");
        });

        it("has correct viewBox", () => {
            const { container } = render(<MoonFilledIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
        });
    });

    describe("CopyIcon", () => {
        it("renders an SVG element", () => {
            const { container } = render(<CopyIcon />);
            expect(container.querySelector("svg")).toBeInTheDocument();
        });

        it("renders with two path elements", () => {
            const { container } = render(<CopyIcon />);
            const paths = container.querySelectorAll("path");
            expect(paths.length).toBe(2);
        });

        it("uses default size of 24", () => {
            const { container } = render(<CopyIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveAttribute("height", "24");
            expect(svg).toHaveAttribute("width", "24");
        });

        it("applies custom className", () => {
            const { container } = render(<CopyIcon className="copy-icon" />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveClass("copy-icon");
        });
    });

    describe("HeartFilledIcon", () => {
        it("renders an SVG element", () => {
            const { container } = render(<HeartFilledIcon />);
            expect(container.querySelector("svg")).toBeInTheDocument();
        });

        it("renders heart path with pink fill", () => {
            const { container } = render(<HeartFilledIcon />);
            const path = container.querySelector("path");
            expect(path).toHaveAttribute("fill", "#ec4899");
        });

        it("applies custom className", () => {
            const { container } = render(<HeartFilledIcon className="heart-icon" />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveClass("heart-icon");
        });
    });

    describe("HeartIconDuotone", () => {
        it("renders an SVG element", () => {
            const { container } = render(<HeartIconDuotone />);
            expect(container.querySelector("svg")).toBeInTheDocument();
        });

        it("renders with two path elements", () => {
            const { container } = render(<HeartIconDuotone />);
            const paths = container.querySelectorAll("path");
            expect(paths.length).toBe(2);
        });
    });

    describe("SunFilledIcon", () => {
        it("renders an SVG element", () => {
            const { container } = render(<SunFilledIcon />);
            expect(container.querySelector("svg")).toBeInTheDocument();
        });

        it("renders circle and line elements", () => {
            const { container } = render(<SunFilledIcon />);
            const circle = container.querySelector("circle");
            const lines = container.querySelectorAll("line");
            expect(circle).toBeInTheDocument();
            expect(lines.length).toBeGreaterThan(0);
        });

        it("uses default size of 24", () => {
            const { container } = render(<SunFilledIcon />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveAttribute("height", "24");
            expect(svg).toHaveAttribute("width", "24");
        });

        it("applies custom className", () => {
            const { container } = render(<SunFilledIcon className="sun-icon" />);
            const svg = container.querySelector("svg");
            expect(svg).toHaveClass("sun-icon");
        });
    });
});
