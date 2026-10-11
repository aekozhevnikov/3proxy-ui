import { formatLogDate } from "@/src/core/log-parser";

describe("formatLogDate", () => {
    it("formats unix timestamp to locale string", () => {
        const result = formatLogDate(1710000000);
        expect(result).toBe(new Date(1710000000 * 1000).toLocaleString());
    });

    it("handles zero timestamp", () => {
        const result = formatLogDate(0);
        expect(result).toBe(new Date(0).toLocaleString());
    });
});