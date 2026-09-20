import { mocked, mockResponse } from '@/tests/unit/test-utils/mock-helpers';
import { render, screen, waitFor } from "@testing-library/react";

import { SessionProvider, useSession } from "@/src/components/session-provider";

const mockSession = {
    isAuthorized: true,
    userId: 1,
};

describe("SessionProvider", () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe("useSession", () => {
        it("returns default session when used outside provider", () => {
            const TestComponent = () => {
                const { session } = useSession();
                return <div data-testid="session-status">{session.isAuthorized ? "authorized" : "unauthorized"}</div>;
            };

            render(<TestComponent />);
            expect(screen.getByTestId("session-status").textContent).toBe("unauthorized");
        });
    });

    describe("SessionProvider component", () => {
        it("renders children", () => {
            render(
                <SessionProvider>
                    <div data-testid="child">Test content</div>
                </SessionProvider>
            );

            expect(screen.getByTestId("child")).toBeInTheDocument();
            expect(screen.getByText("Test content")).toBeInTheDocument();
        });

        it("fetches session on mount", async () => {
            mocked(global.fetch).mockResolvedValueOnce(mockResponse(mockSession));

            render(
                <SessionProvider>
                    <div data-testid="child">Test</div>
                </SessionProvider>
            );

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith("/api/auth/session");
            });
        });

        it("updates session with fetched data", async () => {
            mocked(global.fetch).mockResolvedValueOnce(mockResponse(mockSession));

            const TestConsumer = () => {
                const { session } = useSession();
                return <div data-testid="session-data">{session.userId ?? "none"}</div>;
            };

            render(
                <SessionProvider>
                    <TestConsumer />
                </SessionProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId("session-data").textContent).toBe("1");
            });
        });

        it("sets unauthorized session on fetch failure", async () => {
            mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

            const TestConsumer = () => {
                const { session } = useSession();
                return (
                    <div data-testid="session-status">
                        {session.isAuthorized ? "authorized" : "unauthorized"}
                    </div>
                );
            };

            render(
                <SessionProvider>
                    <TestConsumer />
                </SessionProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId("session-status").textContent).toBe("unauthorized");
            });
        });

        it("updateSession function is provided", async () => {
            mocked(global.fetch).mockResolvedValue(mockResponse(mockSession));

            const TestConsumer = () => {
                const { updateSession, session } = useSession();
                return (
                    <div>
                        <span data-testid="session-auth">{session.isAuthorized ? "true" : "false"}</span>
                        <button onClick={() => updateSession()}>Refresh</button>
                    </div>
                );
            };

            render(
                <SessionProvider>
                    <TestConsumer />
                </SessionProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId("session-auth").textContent).toBe("true");
            });

            // Fetch was called on mount
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });
});
