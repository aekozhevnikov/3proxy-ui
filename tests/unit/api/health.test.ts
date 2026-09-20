/**
 * @jest-environment node
 */

import { GET } from "@/src/app/api/health/route";

describe("health API", () => {
    it("returns status ok with timestamp and uptime", async () => {
        const result = await GET();
        const data = await result.json();

        expect(data.status).toBe("ok");
        expect(data).toHaveProperty("timestamp");
        expect(data).toHaveProperty("uptime");
    });

    it("returns 200 status code", async () => {
        const result = await GET();

        expect(result.status).toBe(200);
    });

    it("returns valid ISO timestamp", async () => {
        const result = await GET();
        const data = await result.json();

        expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });
});
