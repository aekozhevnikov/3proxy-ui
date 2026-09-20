import { app, donationAddresses } from "@/src/core/config";

describe("config", () => {
    describe("app config", () => {
        it("has correct app name", () => {
            expect(app.name).toBe("3proxy UI");
        });

        it("has correct description", () => {
            expect(app.description).toBe("Admin panel for 3proxy");
        });

        it("has a JWT secret of at least 32 characters", () => {
            expect(app.jwtSecret.length).toBeGreaterThanOrEqual(32);
        });

        it("has a URL property", () => {
            expect(app.url).toBeDefined();
            expect(typeof app.url).toBe("string");
        });
    });

    describe("donationAddresses", () => {
        it("contains BTC address", () => {
            expect(donationAddresses.BTC).toBeDefined();
            expect(typeof donationAddresses.BTC).toBe("string");
            expect(donationAddresses.BTC.length).toBeGreaterThan(0);
        });

        it("contains USDT address", () => {
            expect(donationAddresses.USDT).toBeDefined();
            expect(typeof donationAddresses.USDT).toBe("string");
        });

        it("contains ETH address", () => {
            expect(donationAddresses.ETH).toBeDefined();
            expect(typeof donationAddresses.ETH).toBe("string");
        });

        it("contains TON address", () => {
            expect(donationAddresses.TON).toBeDefined();
            expect(typeof donationAddresses.TON).toBe("string");
        });

        it("all addresses are non-empty strings", () => {
            Object.values(donationAddresses).forEach((address) => {
                expect(typeof address).toBe("string");
                expect(address.trim().length).toBeGreaterThan(0);
            });
        });
    });
});
