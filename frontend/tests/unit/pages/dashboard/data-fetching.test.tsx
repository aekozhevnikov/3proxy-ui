import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/src/app/admin/dashboard/page";
import {
    setupFetchMocks,
    setupErrorFetchMock,
    mockSystemStatus,
    mockUserSummary,
    mockTrafficLogs,
} from "./shared-mocks";

describe("DashboardPage data fetching and rendering", () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it("renders dashboard title and subtitle after load", async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ json: async () => mockSystemStatus })
            .mockResolvedValueOnce({ json: async () => mockUserSummary })
            .mockResolvedValueOnce({ json: async () => mockTrafficLogs });

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText("Dashboard")).toBeInTheDocument();
        });
        expect(screen.getByText("3proxy management overview")).toBeInTheDocument();
    });

    it("renders refresh button", async () => {
        setupFetchMocks();

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
        });
    });

    it("renders system status section when loaded", async () => {
        setupFetchMocks();

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText("3proxy Status")).toBeInTheDocument();
        });
        expect(screen.getByText("Running")).toBeInTheDocument();
        expect(screen.getByText("0.1.0")).toBeInTheDocument();
        expect(screen.getByText("12345")).toBeInTheDocument();
    });

    it("renders user summary section when loaded", async () => {
        setupFetchMocks();

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText("Proxy Users")).toBeInTheDocument();
        });
        expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("renders traffic overview when loaded", async () => {
        setupFetchMocks();

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText("Traffic Overview")).toBeInTheDocument();
        });
        expect(screen.getByText("Total Requests")).toBeInTheDocument();
    });

    it("renders system information section", async () => {
        setupFetchMocks();

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText("System Information")).toBeInTheDocument();
        });
        expect(screen.getAllByText(/entries/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/files/i)[0]).toBeInTheDocument();
    });

    it("handles individual fetch failures gracefully", async () => {
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new Error("System status error"))
            .mockResolvedValueOnce({ json: async () => mockUserSummary })
            .mockResolvedValueOnce({ json: async () => mockTrafficLogs });

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText("Dashboard")).toBeInTheDocument();
        });
    });

    it("calls fetch for three endpoints on load", async () => {
        setupFetchMocks();

        render(<DashboardPage />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });
    });

    it("displays stopped status when proxy is not running", async () => {
        const stoppedStatus = {
            ...mockSystemStatus,
            status: {
                ...mockSystemStatus.status,
                isRunning: false,
                pid: null,
                memoryUsage: null,
            },
        };

        global.fetch = jest.fn()
            .mockResolvedValueOnce({ json: async () => stoppedStatus })
            .mockResolvedValueOnce({ json: async () => mockUserSummary })
            .mockResolvedValueOnce({ json: async () => mockTrafficLogs });

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText("Stopped")).toBeInTheDocument();
        });
    });
});