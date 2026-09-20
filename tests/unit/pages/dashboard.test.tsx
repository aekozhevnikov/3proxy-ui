import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

const mockSetTheme = jest.fn();
jest.mock("next-themes", () => ({
    useTheme: () => ({
        theme: "light",
        setTheme: mockSetTheme,
    }),
}));

jest.mock("next/navigation", () => ({
    useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock("next/image", () => ({
    __esModule: true,
    default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} src={src || ""} {...props} />,
}));

jest.mock("@/src/components/icons", () => ({
    MoonFilledIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="moon-icon" {...props} />,
    SunFilledIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="sun-icon" {...props} />,
    HeartFilledIcon: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="heart-icon" {...props} />,
}));

jest.mock("@/src/app/admin/dashboard/useDashboardData", () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock("@/src/app/admin/dashboard/DashboardHeader", () => {
    return function MockDashboardHeader() {
        return <div data-testid="dashboard-header">Dashboard</div>;
    };
});

jest.mock("@/src/app/admin/dashboard/SystemStatusCard", () => {
    return function MockSystemStatusCard() {
        return <div data-testid="system-status-card">System Status</div>;
    };
});

jest.mock("@/src/app/admin/dashboard/UserSummaryCard", () => {
    return function MockUserSummaryCard() {
        return <div data-testid="user-summary-card">User Summary</div>;
    };
});

jest.mock("@/src/app/admin/dashboard/TrafficOverviewCard", () => {
    return function MockTrafficOverviewCard() {
        return <div data-testid="traffic-overview-card">Traffic Overview</div>;
    };
});

jest.mock("@/src/app/admin/dashboard/SystemInfoCard", () => {
    return function MockSystemInfoCard() {
        return <div data-testid="system-info-card">System Information</div>;
    };
});

import DashboardPage from "@/src/app/admin/dashboard/page";
import useDashboardData from "@/src/app/admin/dashboard/useDashboardData";

const mockData = {
    systemStatus: {
        success: true,
        status: { isRunning: true, version: "1.0", memoryUsage: 100, pid: 123 },
        config: { exists: true, modified: "2025-01-01" },
        users: { count: 10, proxyauthSize: 100, proxyauthModified: "2025-01-01" },
        logs: { size: 0, fileCount: 0 },
        timestamp: "2025-01-01T00:00:00Z",
    },
    userSummary: { total: 10, active: 8, inactive: 2, withDataLimit: 5 },
    trafficStats: { totalSent: 1024, totalReceived: 2048, totalRequests: 100 },
};

describe("DashboardPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders loading spinner on initial load", () => {
        mocked(useDashboardData).mockReturnValue({ data: null, loading: true, refreshing: false, error: null, refresh: jest.fn() });

        const { container } = render(<DashboardPage />);
        const spinner = container.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
    });

    it("renders dashboard title after load", async () => {
        mocked(useDashboardData).mockReturnValue({ data: mockData, loading: false, refreshing: false, error: null, refresh: jest.fn() });

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
        });
    });

    it("renders all cards when loaded", async () => {
        mocked(useDashboardData).mockReturnValue({ data: mockData, loading: false, refreshing: false, error: null, refresh: jest.fn() });

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByTestId("system-status-card")).toBeInTheDocument();
            expect(screen.getByTestId("user-summary-card")).toBeInTheDocument();
            expect(screen.getByTestId("traffic-overview-card")).toBeInTheDocument();
            expect(screen.getByTestId("system-info-card")).toBeInTheDocument();
        });
    });

    it("renders error state with retry button", () => {
        mocked(useDashboardData).mockReturnValue({ data: null, loading: false, refreshing: false, error: "Failed to load", refresh: jest.fn() });

        render(<DashboardPage />);

        expect(screen.getByText("Failed to load")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("shows stopped status when proxy not running", async () => {
        const stoppedData = {
            ...mockData,
            systemStatus: { ...mockData.systemStatus, status: { ...mockData.systemStatus.status, isRunning: false } },
        };
        mocked(useDashboardData).mockReturnValue({ data: stoppedData, loading: false, refreshing: false, error: null, refresh: jest.fn() });

        render(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByTestId("system-status-card")).toBeInTheDocument();
        });
    });
});
