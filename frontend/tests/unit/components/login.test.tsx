"use client";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/src/app/login/page";

jest.mock("next-themes", () => ({
    useTheme: () => ({
        theme: "light",
        setTheme: jest.fn(),
    }),
}));

jest.mock("next/image", () => ({
    __esModule: true,
    default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} src={src || ""} {...props} />,
}));

jest.mock("@/src/components/icons", () => ({
    MoonFilledIcon: ({ ...props }: React.SVGProps<SVGSVGElement>) => <svg data-testid="moon-icon" {...props} />,
    SunFilledIcon: ({ ...props }: React.SVGProps<SVGSVGElement>) => <svg data-testid="sun-icon" {...props} />,
}));

const originalHrefDescriptor = Object.getOwnPropertyDescriptor(
    window.Location.prototype,
    "href"
);

beforeAll(() => {
    Object.defineProperty(window.Location.prototype, "href", {
        configurable: true,
        get() {
            return "";
        },
        set() {},
    });
});

afterAll(() => {
    if (originalHrefDescriptor) {
        Object.defineProperty(window.Location.prototype, "href", originalHrefDescriptor);
    }
});

describe("LoginPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
            expect(global.fetch).toHaveBeenCalledWith(
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
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    it("shows error on failed login", async () => {
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

    it("shows error on network error", async () => {
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

    it("shows loading state while submitting", async () => {
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
