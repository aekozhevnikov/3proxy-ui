import { formatBytes } from "@/src/core/log-parser";

describe("formatBytes", () => {
    it("returns '0 B' for zero bytes", () => {
        expect(formatBytes(0)).toBe("0 B");
    });

    it("formats bytes correctly", () => {
        expect(formatBytes(512)).toBe("512 B");
    });

    it("formats kilobytes correctly", () => {
        expect(formatBytes(1024)).toBe("1 KB");
    });

    it("formats megabytes correctly", () => {
        expect(formatBytes(1048576)).toBe("1 MB");
    });

    it("formats gigabytes correctly", () => {
        expect(formatBytes(1073741824)).toBe("1 GB");
    });

    it("formats mixed byte values with decimals", () => {
        expect(formatBytes(1536)).toBe("1.5 KB");
    });
});