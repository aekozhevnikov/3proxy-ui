// Common setup for all tests
// Polyfill Web Fetch APIs for Jest/jsdom (required by next/server)
if (!global.Request) global.Request = globalThis.Request;
if (!global.Response) global.Response = globalThis.Response;
if (!global.Headers) global.Headers = globalThis.Headers;
if (!global.TextEncoder) global.TextEncoder = globalThis.TextEncoder;

// Set up environment variables for tests
process.env.JWT_SECRET = "dev-secret-key-min-32-characters-long";
Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    writable: true,
    configurable: true
});

// Mock next/navigation
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/"
}));

// Global mocks for Next.js server modules (avoids TextEncoder issues in jsdom)
jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
    revalidateTag: jest.fn(),
    unstable_cache: jest.fn(),
    unstable_getCacheKey: jest.fn()
}));

// Mock next/headers for API route tests
jest.mock("next/headers", () => ({
    cookies: jest.fn(),
    headers: jest.fn()
}));

// Mock fs and path for log-parser tests (needed in both jsdom and node envs)
jest.mock("fs", () => ({
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
    statSync: jest.fn()
}));

jest.mock("path", () => ({
    join: jest.fn((...args: string[]) => args.join("/"))
}));
