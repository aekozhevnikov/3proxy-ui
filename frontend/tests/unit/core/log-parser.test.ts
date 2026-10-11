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
import path from "path";
import { getAvailableLogDates, getLogStats } from "@/src/core/log-parser";
import { mockLogLine, mockLogLine2 } from "./log-parser/shared-mocks";

const setupBaseMocks = () => {
    mocked(fs.existsSync).mockReturnValue(true);
    (mocked(fs.readdirSync) as unknown as jest.Mock<string[], [string]>).mockReturnValue([
        "3proxy.log.2024.03.10",
        "3proxy.log.2024.02.15",
    ]);
    mocked(fs.readFileSync).mockReturnValue(`${mockLogLine}\n${mockLogLine2}`);
    mocked(fs.statSync).mockReturnValue({ size: 1024 } as fs.Stats);
    mocked(path.join).mockImplementation((...args: string[]) => args.join("/"));
};

describe("getAvailableLogDates", () => {
    beforeEach(() => {
        setupBaseMocks();
    });

    it("returns dates sorted in reverse order", async () => {
        mocked(fs.existsSync).mockReturnValue(true);
        (mocked(fs.readdirSync) as unknown as jest.Mock<string[], [string]>).mockReturnValue([
            "3proxy.log.2024.03.10",
            "3proxy.log.2024.02.15",
            "3proxy.log.2024.01.08",
        ]);

        const result = await getAvailableLogDates();

        expect(result.length).toBe(3);
        expect(result[0]).toBe("log-2024-03");
        expect(result[2]).toBe("log-2024-01");
    });

    it("returns empty array when no log files", async () => {
        (mocked(fs.readdirSync) as unknown as jest.Mock<string[], [string]>).mockReturnValue([]);

        const result = await getAvailableLogDates();
        expect(result).toEqual([]);
    });

    it("returns empty array when log directory doesn't exist", async () => {
        mocked(fs.existsSync).mockReturnValue(false);

        const result = await getAvailableLogDates();
        expect(result).toEqual([]);
    });
});

describe("getLogStats", () => {
    beforeEach(() => {
        setupBaseMocks();
    });

    it("returns correct stats structure", async () => {
        const result = await getLogStats();

        expect(result).toHaveProperty("totalLogs");
        expect(result).toHaveProperty("dateRange");
        expect(result).toHaveProperty("files");
        expect(result).toHaveProperty("size");
    });

    it("returns correct file count", async () => {
        const result = await getLogStats();
        expect(result.files).toBe(2);
    });

    it("returns correct total size", async () => {
        const result = await getLogStats();
        expect(result.size).toBe(2048);
    });

    it("returns correct date range", async () => {
        const result = await getLogStats();
        expect(result.dateRange.earliest).toBeDefined();
        expect(result.dateRange.latest).toBeDefined();
    });

    it("returns empty stats when no log files", async () => {
        (mocked(fs.readdirSync) as unknown as jest.Mock<string[], [string]>).mockReturnValue([]);

        const result = await getLogStats();
        expect(result.totalLogs).toBe(0);
        expect(result.files).toBe(0);
        expect(result.dateRange.earliest).toBeNull();
        expect(result.dateRange.latest).toBeNull();
    });
});
