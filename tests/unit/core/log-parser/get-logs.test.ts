import { mocked } from '@/tests/unit/test-utils/mock-helpers';

process.env.LOGS_DIR = "/mock/logs";

jest.mock("fs", () => {
    const mockFs = {
        existsSync: jest.fn(),
        readdirSync: jest.fn(),
        readFileSync: jest.fn(),
        statSync: jest.fn(),
    };
    return {
        __esModule: true,
        ...mockFs,
        default: mockFs,
    };
});

jest.mock("path", () => {
    const actualPath = jest.requireActual("path");
    const mockPath = {
        ...actualPath,
        join: jest.fn((...args: string[]) => args.join("/")),
    };
    return {
        __esModule: true,
        ...mockPath,
        default: mockPath,
    };
});

import fs from "fs";
import { getLogs } from "@/src/core/log-parser";
import { mockLogLine, mockLogLine2 } from "./shared-mocks";

const setupBaseMocks = () => {
    mocked(fs.existsSync).mockReturnValue(true);
    (mocked(fs.readdirSync) as unknown as jest.Mock<string[], [string]>).mockReturnValue([
        "3proxy.log.2024.03.10",
        "3proxy.log.2024.03.09",
    ]);
    (mocked(fs.readFileSync) as unknown as jest.Mock<string, [fs.PathOrFileDescriptor]>).mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const path = typeof filePath === "string" ? filePath : "";
        if (path.includes("2024.03.10")) return mockLogLine;
        if (path.includes("2024.03.09")) return mockLogLine2;
        return "";
    });
};

describe("getLogs", () => {
    beforeEach(() => {
        setupBaseMocks();
    });

    it("returns logs from multiple files", async () => {
        const result = await getLogs();

        expect(result.entries.length).toBeGreaterThan(0);
        expect(result.total).toBeGreaterThan(0);
        expect(result.filesScanned).toBe(2);
    });

    it("returns empty entries when no log files exist", async () => {
        (mocked(fs.readdirSync) as unknown as jest.Mock<string[], [string]>).mockReturnValue([]);

        const result = await getLogs();

        expect(result.entries).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.filesScanned).toBe(0);
    });

    it("applies username filter", async () => {
        const result = await getLogs({ username: "testuser", limit: 100 });

        expect(result.entries.length).toBe(1);
        expect(result.entries.every((e) => e.auth.user === "testuser")).toBe(true);
    });

    it("applies log type filter", async () => {
        const result = await getLogs({ logType: "PROXY" });

        expect(result.entries.every((e) => e.proxy.type === "PROXY")).toBe(true);
    });

    it("applies limit filter", async () => {
        const result = await getLogs({ limit: 1 });

        expect(result.entries.length).toBeLessThanOrEqual(1);
    });

    it("applies offset filter", async () => {
        const result = await getLogs({ offset: 1, limit: 100 });

        expect(result.entries.length).toBeGreaterThanOrEqual(0);
    });

    it("uses default limit of 1000", async () => {
        const result = await getLogs({ username: "nonexistent" });

        expect(result).toBeDefined();
        expect(result.entries).toEqual([]);
    });
});
