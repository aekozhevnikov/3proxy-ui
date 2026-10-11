// Shared setup and test data for ProfileForm tests
// jest.mock calls for common modules are in jest.setup.ts

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

export const mockCurrentUsername = "admin";

export const setupMocks = () => {
    jest.clearAllMocks();
    mockFetch.mockReset();
};
