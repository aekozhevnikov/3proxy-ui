// Shared mocks and test data for DashboardPage tests
// jest.mock calls for common modules are in jest.setup.ts

export const mockSystemStatus = {
    success: true,
    status: {
        isRunning: true,
        version: "0.1.0",
        memoryUsage: 1024000,
        pid: 12345,
    },
    config: {
        exists: true,
        modified: "2024-01-15T10:30:00Z",
    },
    users: {
        count: 10,
        proxyauthSize: 500,
        proxyauthModified: "2024-01-15T10:30:00Z",
    },
    logs: {
        size: 10240,
        fileCount: 3,
    },
    trafficSync: {
        lastSync: "2024-01-15T10:30:00Z",
        updatedCount: 5,
    },
    timestamp: "2024-01-15T10:30:00Z",
};

export const mockUserSummary = {
    success: true,
    stats: {
        total: 10,
        active: 8,
        inactive: 2,
        withDataLimit: 5,
    },
};

export const mockTrafficLogs = {
    success: true,
    logs: [
        {
            auth: { user: "user1" },
            bytes: { sent: 1024, received: 2048 },
        },
        {
            auth: { user: "user2" },
            bytes: { sent: 4096, received: 8192 },
        },
    ],
};

export const setupFetchMocks = () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce({ json: async () => mockSystemStatus })
        .mockResolvedValueOnce({ json: async () => mockUserSummary })
        .mockResolvedValueOnce({ json: async () => mockTrafficLogs });
};

export const setupErrorFetchMock = () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
};