/**
 * Regression guard.
 *
 * This module is a "use server" file, so every export is a network-callable
 * endpoint rather than a private helper. It used to export getAllProxyUsers,
 * which did findMany with no select and spread the whole row, handing every
 * proxy user's plaintext password to any caller that reached the action. It had
 * no callers and no authorisation check, so it was removed; this test fails if
 * it comes back in any form.
 */
import * as proxyUserActions from "@/src/core/actions/proxy-user";

describe("proxy-user server actions", () => {
    it("exposes no list action that returns the password column", () => {
        expect(Object.keys(proxyUserActions)).not.toContain("getAllProxyUsers");
    });

    it("exports only the per-user actions the panel actually calls", () => {
        expect(Object.keys(proxyUserActions).sort()).toEqual([
            "createProxyUser",
            "deleteProxyUser",
            "getProxyUserById",
            "incrementDataUsage",
            "updateProxyUser"
        ]);
    });
});
