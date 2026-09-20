import { render } from "@testing-library/react";
import { asHtmlElement } from "@/tests/unit/test-utils/mock-helpers";

jest.mock("next/navigation", () => ({
    useRouter: () => ({
        replace: jest.fn(),
    }),
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
    MoonFilledIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="moon-icon" {...props} />,
    SunFilledIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="sun-icon" {...props} />,
}));

import HomePage from "@/src/app/page";

describe("HomePage", () => {
    it("renders loading spinner", () => {
        const { container } = render(<HomePage />);
        const spinner = container.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
    });

    it("renders spinner with correct styles", () => {
        const { container } = render(<HomePage />);
        const spinner = container.querySelector(".animate-spin.rounded-full.h-32.w-32.border-b-2.border-gray-900");
        expect(spinner).toBeInTheDocument();
    });

    it("renders spinner on full screen container", () => {
        const { container } = render(<HomePage />);
        const wrapper = asHtmlElement(container.firstChild);
        expect(wrapper).toHaveClass("min-h-screen");
        expect(wrapper).toHaveClass("flex");
        expect(wrapper).toHaveClass("items-center");
        expect(wrapper).toHaveClass("justify-center");
    });
});
