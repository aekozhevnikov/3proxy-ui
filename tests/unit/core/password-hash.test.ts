import { hashProxyPassword } from "@/src/core/password-hash";

jest.mock("nano-md5", () => ({
    crypt: jest.fn((str: string, salt: string) => `hashed_${str}_${salt}`),
}));

describe("hashProxyPassword", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns a hashed password", () => {
        const result = hashProxyPassword("mypassword");
        expect(result).toBe("hashed_mypassword_qwer");
    });

    it("passes salt 'qwer' to crypt function", () => {
        hashProxyPassword("test");
        expect(require("nano-md5").crypt).toHaveBeenCalledWith("test", "qwer");
    });

    it("produces same hash for same password", () => {
        const hash1 = hashProxyPassword("password123");
        const hash2 = hashProxyPassword("password123");
        expect(hash1).toBe(hash2);
    });

    it("produces different hash for different passwords", () => {
        const hash1 = hashProxyPassword("password1");
        const hash2 = hashProxyPassword("password2");
        expect(hash1).not.toBe(hash2);
    });

    it("handles empty password", () => {
        const result = hashProxyPassword("");
        expect(result).toBe("hashed__qwer");
    });

    it("handles special characters in password", () => {
        const result = hashProxyPassword("p@ssw0rd!#$%");
        expect(result).toBe("hashed_p@ssw0rd!#$%_qwer");
    });
});
