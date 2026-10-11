/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useIsClient } from "@/src/core/use-is-client";

describe("useIsClient", () => {
    it("returns a boolean value", () => {
        const { result } = renderHook(() => useIsClient());
        expect(typeof result.current).toBe("boolean");
    });

    it("returns true after useEffect runs (client-side)", async () => {
        const { result } = renderHook(() => useIsClient());

        // In jsdom, useEffect runs after initial render
        // After effect runs, isClient becomes true
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(result.current).toBe(true);
    });

    it("hook is a function", () => {
        expect(typeof useIsClient).toBe("function");
    });
});
