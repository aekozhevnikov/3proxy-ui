import { render, screen } from "@testing-library/react";

import NotFound from "@/src/app/not-found";
import { asHtmlElement } from "@/tests/unit/test-utils/mock-helpers";

describe("NotFound", () => {
    it("renders 404 heading", () => {
        render(<NotFound />);
        expect(screen.getByText("404")).toBeInTheDocument();
    });

    it("renders page not found message", () => {
        render(<NotFound />);
        expect(screen.getByText("Page not found")).toBeInTheDocument();
    });

    it("renders with full screen layout", () => {
        const { container } = render(<NotFound />);
        const wrapper = asHtmlElement(container.firstChild);
        expect(wrapper).toHaveClass("min-h-screen");
        expect(wrapper).toHaveClass("flex");
        expect(wrapper).toHaveClass("items-center");
        expect(wrapper).toHaveClass("justify-center");
    });

    it("renders centered content", () => {
        const { container } = render(<NotFound />);
        const content = container.querySelector("div.text-center");
        expect(content).toBeInTheDocument();
    });
});
