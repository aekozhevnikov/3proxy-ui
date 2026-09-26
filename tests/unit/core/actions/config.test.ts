import { mocked } from "@/tests/unit/test-utils/mock-helpers";
import { update3proxyConfig } from "@/src/core/actions/config";
import { prisma } from "@/src/prisma/db";
import { hashProxyPassword } from "@/src/core/password-hash";

jest.mock("@/src/prisma/db", () => ({
    prisma: {
        proxyUser: {
            findMany: jest.fn()
        }
    }
}));

jest.mock("@/src/core/password-hash", () => {
    const hashProxyPassword = jest.fn((password: string) => `hashed_${password}`);

    return {
        hashProxyPassword,
        proxyauthEntry: jest.fn(
            (username: string, password: string) => `${username}:CR:"${hashProxyPassword(password)}"`
        )
    };
});

jest.mock("fs", () => ({
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn()
}));

jest.mock("child_process", () => ({
    exec: jest.fn((cmd, options, callback) => {
        callback(null, "", "");
    }),
    promisify: () => jest.fn(() => jest.fn().mockResolvedValue({ stdout: "container123", stderr: "" }))
}));

jest.mock("path", () => ({
    join: jest.fn((...args: string[]) => args.join("/")),
    dirname: jest.fn(() => "/fake/path")
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn()
}));

jest.mock("os", () => ({
    platform: jest.fn().mockReturnValue("linux")
}));

const mockActiveUser = {
    id: 1,
    username: "activeuser",
    password: "pass1",
    isActive: true,
    dataLimit: BigInt(1024),
    ipLimit: 1,
    telegramUserId: null,
    expiresAt: null,
    deactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    dataUsed: BigInt(0)
};

const mockInactiveUser = {
    id: 2,
    username: "inactiveuser",
    password: "pass2",
    isActive: false,
    dataLimit: null,
    ipLimit: 1,
    telegramUserId: null,
    expiresAt: null,
    deactivatedAt: new Date("2024-01-15"),
    createdAt: new Date(),
    updatedAt: new Date(),
    dataUsed: BigInt(0)
};

describe("update3proxyConfig", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mocked(prisma.proxyUser.findMany).mockResolvedValue([]);
    });

    it("writes proxyauth file with active users", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([mockActiveUser]);

        const result = await update3proxyConfig();
        const fs = require("fs");
        expect(fs.writeFileSync).toHaveBeenCalled();
        const writtenContent: string = fs.writeFileSync.mock.calls[0][1] ?? "";
        expect(writtenContent).toContain("activeuser:CR:");
        expect(result.success).toBe(true);
    });

    it("omits deactivated users entirely", async () => {
        // A "#" line is not a comment in a file pulled in by 3proxy's $ directive:
        // the included file is parsed recursively with no comment handling, so a
        // "commented out" user is still registered and can authenticate.
        mocked(prisma.proxyUser.findMany).mockResolvedValue([mockInactiveUser]);

        await update3proxyConfig();
        const fs = require("fs");
        const writtenContent: string = fs.writeFileSync.mock.calls[0][1] ?? "";
        expect(writtenContent).not.toContain("inactiveuser");
        expect(writtenContent).not.toContain("# DEACTIVATED");
    });

    it("returns user count in result", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([mockActiveUser, mockInactiveUser]);

        const result = await update3proxyConfig();

        expect(result.userCount).toBe(2);
    });

    it("returns success message with deactivation count", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([mockActiveUser, mockInactiveUser]);

        const result = await update3proxyConfig();

        expect(result.message).toContain("1 deactivated");
    });

    it("handles empty users list", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([]);

        const result = await update3proxyConfig();

        expect(result.success).toBe(true);
        expect(result.userCount).toBe(0);
    });

    it("hashes passwords with hashProxyPassword", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([mockActiveUser]);

        await update3proxyConfig();

        expect(hashProxyPassword).toHaveBeenCalledWith("pass1");
    });

    it("calls revalidatePath for users page", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([mockActiveUser]);

        await update3proxyConfig();

        const revalidatePath = require("next/cache").revalidatePath;
        expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
    });

    it("throws error on database failure", async () => {
        mocked(prisma.proxyUser.findMany).mockRejectedValue(new Error("DB error"));

        await expect(update3proxyConfig()).rejects.toThrow("Failed to update config");
    });
});
