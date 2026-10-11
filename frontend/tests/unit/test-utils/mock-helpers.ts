import { jest } from "@jest/globals";

/**
 * Type-safe utilities for Jest mocks.
 *
 * These helpers replace the `as jest.Mock` type assertion pattern with
 * type-safe alternatives using jest.MockedFunction<T>.
 */

/**
 * Re-export of jest.mocked for convenience.
 * This is the direct replacement for `mocked(fn)` patterns.
 *
 * Usage:
 *   import { mocked } from "@/tests/unit/test-utils/mock-helpers";
 *
 *   mocked(prisma.proxyUser.findMany).mockResolvedValue([...])
 *   mocked(global.fetch).mockResolvedValueOnce(...)
 */
export const mocked = jest.mocked;

/**
 * Type-safe assertion helpers for DOM elements.
 * Replaces `as HTMLElement` and `as HTMLInputElement` patterns.
 */
export function asHtmlElement(node: Node | null): HTMLElement {
    if (node instanceof HTMLElement) return node;
    throw new Error(`Expected HTMLElement but got: ${node?.nodeName ?? "null"}`);
}

export function asInputElement(node: Element | null): HTMLInputElement {
    if (node instanceof HTMLInputElement) return node;
    throw new Error(`Expected HTMLInputElement but got: ${node?.tagName ?? "null"}`);
}

/**
 * Type-safe helper for mocking global.fetch.
 * Returns the mocked function with full type inference from the original.
 */
export function mockGlobalFetch() {
    return mocked(global.fetch);
}

/**
 * Type-safe helper for mocking prisma client methods.
 * Usage: mockedPrisma(prisma.proxyUser.findMany).mockResolvedValue([...])
 */
export function mockedPrisma<T extends (...args: unknown[]) => unknown>(fn: T): jest.MockedFunction<T> {
    return fn as unknown as jest.MockedFunction<T>;
}

/**
 * Creates a properly typed mock Response object for fetch mocks.
 *
 * Usage:
 *   global.fetch = jest.fn().mockResolvedValue(mockResponse({ data: "test" }));
 *   mocked(global.fetch).mockResolvedValue(mockResponse({ ok: false, body: { error: "fail" } }));
 */
export function mockResponse<T = unknown>(body: T, options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
} = {}): Response {
    const {
        ok = true,
        status = ok ? 200 : 500,
        statusText = ok ? "OK" : "Internal Server Error",
        headers = {},
    } = options;

    const jsonPromise = Promise.resolve(body);

    const mockObj: Partial<Response> & { json: () => Promise<T> } = {
        ok,
        status,
        statusText,
        headers: new Headers(headers),
        redirected: false,
        type: "basic" as ResponseType,
        url: "",
        json: async () => body,
    };

    return mockObj as Response;
}