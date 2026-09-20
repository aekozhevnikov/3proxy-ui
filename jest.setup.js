// Common setup for all tests (JS to avoid TypeScript parsing issues)

// Polyfill Web Fetch APIs for Jest/jsdom (required by next/server)
var nodeGlobals = globalThis;

if (!globalThis.Request) globalThis.Request = nodeGlobals.Request;
if (!globalThis.Response) globalThis.Response = nodeGlobals.Response;
if (!globalThis.Headers) globalThis.Headers = nodeGlobals.Headers;
if (!globalThis.TextEncoder) globalThis.TextEncoder = nodeGlobals.TextEncoder;
if (!globalThis.TextDecoder) globalThis.TextDecoder = nodeGlobals.TextDecoder;

// Set up environment variables for tests
process.env.JWT_SECRET = "dev-secret-key-min-32-characters-long";
process.env.NODE_ENV = "test";

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
    unstable_getCacheKey: jest.fn(),
}));

// Mock next/headers for API route tests
jest.mock("next/headers", () => ({
    cookies: jest.fn(),
    headers: jest.fn(),
}));

// Mock fs and path for log-parser tests (needed in both jsdom and node envs)
// Use real path module to avoid issues with source code that relies on path functions
// jest.mock("fs", () => ({
//     existsSync: jest.fn(),
//     readdirSync: jest.fn(),
//     readFileSync: jest.fn(),
//     statSync: jest.fn(),
// }));
// jest.mock("path", () => ({
//     join: jest.fn(function() {
//         var args = Array.from(arguments);
//         return args.join("/");
//     }),
// }));