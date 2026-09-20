/**
 * @jest-environment node
 */

import { POST } from "@/src/app/api/auth/logout/route";

describe("auth/logout API", () => {
    it("returns success response with cleared cookie", async () => {
        const result = await POST();
        const data = await result.json();

        expect(data).toEqual({ success: true });
    });

    it("sets session cookie with empty value and maxAge 0", async () => {
        const result = await POST();
        const cookieHeader = result.headers.get("Set-Cookie");

        expect(cookieHeader).toContain("session=");
        expect(cookieHeader).toContain("Max-Age=0");
    });

    it("sets httpOnly cookie", async () => {
        const result = await POST();
        const cookieHeader = result.headers.get("Set-Cookie");

        expect(cookieHeader).toContain("HttpOnly");
    });
});
