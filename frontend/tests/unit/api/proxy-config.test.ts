/**
 * @jest-environment node
 */

import { GET } from "@/src/app/api/proxy-config/route";

describe("proxy-config API", () => {
    it("returns config with default values", async () => {
        const result = await GET();
        const data = await result.json();

        expect(data).toHaveProperty("domain");
        expect(data).toHaveProperty("httpPort");
        expect(data).toHaveProperty("socksPort");
    });
});
