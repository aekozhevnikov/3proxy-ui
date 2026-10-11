// Shared setup and test data for LoginPage tests
// jest.mock calls for common modules are in jest.setup.ts

const mockFetch = jest.fn();
(global as Record<string, unknown>).fetch = mockFetch;

export const setupMocks = () => {
    jest.clearAllMocks();
    window.location.href = "";
    mockFetch.mockReset();
};
