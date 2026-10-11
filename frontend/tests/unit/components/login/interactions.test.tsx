import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/src/app/login/page";
import { setupMocks } from "./shared-mocks";

const mockFetch = global.fetch as jest.Mock;

describe("LoginPage interactions", () => {
    beforeEach(() => {
        setupMocks();
    });

    it("submits login form with credentials", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
        } as never);

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText("Enter username"), {
            target: { value: "admin" },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
            target: { value: "secretpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                "/api/auth/login",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: "admin", password: "secretpass" }),
                })
            );
        });
    });

    it("redirects to /admin/users on successful login", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
        } as never);

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText("Enter username"), {
            target: { value: "admin" },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
            target: { value: "pass123" },
        });

        const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
        fireEvent.submit(form);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    it("shows error on login failure (401)", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Invalid credentials" }),
        } as never);

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText("Enter username"), {
            target: { value: "wrong" },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
            target: { value: "wrongpass" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
        });
    });

    it("shows default error on login failure (unknown error)", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({}),
        } as never);

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText("Enter username"), {
            target: { value: "test" },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
            target: { value: "test" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
        });
    });

    it("shows error on network failure", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText("Enter username"), {
            target: { value: "test" },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
            target: { value: "test" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Network error")).toBeInTheDocument();
        });
    });

    it("shows loading state during login", async () => {
        let resolveFetch: (value: unknown) => void;
        const fetchPromise = new Promise((resolve) => {
            resolveFetch = resolve;
        });
        mockFetch.mockReturnValue(fetchPromise);

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText("Enter username"), {
            target: { value: "test" },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
            target: { value: "test" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("Signing in...")).toBeInTheDocument();
        });

        resolveFetch!({ ok: true });
    });

    it("disables submit button while loading", async () => {
        let resolveFetch: (value: unknown) => void;
        const fetchPromise = new Promise((resolve) => {
            resolveFetch = resolve;
        });
        mockFetch.mockReturnValue(fetchPromise);

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText("Enter username"), {
            target: { value: "test" },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
            target: { value: "test" },
        });

        fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

        await waitFor(() => {
            const submitButton = screen.getByRole("button", { name: /signing in/i });
            expect(submitButton).toBeDisabled();
        });

        resolveFetch!({ ok: true });
    });
});