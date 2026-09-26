import { proxyauthEntry, hashProxyPassword } from "@/src/core/password-hash";

jest.mock("nano-md5", () => ({
    crypt: jest.fn((str: string, salt: string) => `hashed_${str}_${salt}`)
}));

const SALT_ALPHABET = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

describe("hashProxyPassword", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("uses MD5-crypt rather than the truncating DES variant", () => {
        hashProxyPassword("mypassword");
        const salt = require("nano-md5").crypt.mock.calls[0][1];
        expect(salt.startsWith("$1$")).toBe(true);
    });

    it("generates an 8 character salt from the crypt alphabet", () => {
        hashProxyPassword("mypassword");
        const salt = require("nano-md5").crypt.mock.calls[0][1].slice(3);
        expect(salt).toHaveLength(8);
        for (const char of salt) {
            expect(SALT_ALPHABET).toContain(char);
        }
    });

    it("uses a different salt on every call", () => {
        hashProxyPassword("password123");
        hashProxyPassword("password123");
        const first = require("nano-md5").crypt.mock.calls[0][1];
        const second = require("nano-md5").crypt.mock.calls[1][1];
        expect(first).not.toBe(second);
    });

    it("passes the password through unchanged", () => {
        hashProxyPassword("p@ssw0rd!#$%");
        expect(require("nano-md5").crypt).toHaveBeenCalledWith("p@ssw0rd!#$%", expect.stringContaining("$1$"));
    });

    it("handles an empty password", () => {
        expect(hashProxyPassword("")).toContain("hashed_");
    });
});

describe("proxyauthEntry", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("emits the CR type with a quoted hash", () => {
        const entry = proxyauthEntry("alice", "secret");
        expect(entry.startsWith("alice:CR:\"")).toBe(true);
        expect(entry.endsWith("\"")).toBe(true);
    });

    it("quotes the hash because 3proxy reads a leading $ as an include macro", () => {
        const entry = proxyauthEntry("alice", "secret");
        const quoted = entry.slice("alice:CR:".length);
        expect(quoted.startsWith('"')).toBe(true);
        expect(quoted.endsWith('"')).toBe(true);
        expect(quoted).toContain("$1$");
    });
});
