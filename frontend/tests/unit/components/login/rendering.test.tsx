import { render, screen } from "@testing-library/react";
import LoginPage from "@/src/app/login/page";
import { setupMocks } from "./shared-mocks";

describe("LoginPage rendering", () => {
    beforeEach(() => {
        setupMocks();
    });

    it("renders login form with username and password fields", () => {
        render(<LoginPage />);

        expect(screen.getByPlaceholderText("Enter username")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    });

    it("renders Sign in button", () => {
        render(<LoginPage />);

        expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("renders title and subtitle", () => {
        render(<LoginPage />);

        expect(screen.getByText("3proxy UI")).toBeInTheDocument();
        expect(screen.getByText("Sign in to manage proxy users")).toBeInTheDocument();
    });

    it("renders theme toggle button", () => {
        render(<LoginPage />);

        expect(screen.getByLabelText("Toggle theme")).toBeInTheDocument();
    });

    it("does not show error initially", () => {
        render(<LoginPage />);

        expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
    });
});