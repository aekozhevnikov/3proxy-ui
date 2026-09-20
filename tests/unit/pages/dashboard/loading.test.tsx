import { render, screen } from "@testing-library/react";
import DashboardPage from "@/src/app/admin/dashboard/page";

describe("DashboardPage loading", () => {
    it("renders loading spinner on initial load", () => {
        global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));

        const { container } = render(<DashboardPage />);

        const spinner = container.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
    });
});