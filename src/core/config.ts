import { z } from "zod";

const appConfigSchema = z.object({
    name: z.string().default("3proxy UI"),
    description: z.string().default("Admin panel for 3proxy"),
    url: z.string().default("http://localhost:3000"),
    jwtSecret: z.string().min(32)
});

// In development, allow a fallback JWT secret if not set (not for production!)
const jwtSecret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "development" ? "dev-secret-key-min-32-characters-long" : undefined);

export const app = appConfigSchema.parse({
    name: process.env.APP_NAME || "3proxy UI",
    description: process.env.APP_DESCRIPTION || "Admin panel for 3proxy",
    url: process.env.APP_URL || "http://localhost:3000",
    jwtSecret
});

// Donation addresses (hardcoded like in OutlineAdmin)
export const donationAddresses = {
    BTC: "bc1q6ghwetuv60tug74yr4dm48hjw8w5w2cenvan6x",
    USDT: "TGoWzFXR7FewW1S9XfD7wc1tAjpTWx4g8Q",
    ETH: "0x32318f9fc771353b2fEF73B65Bc4684fB9285D78",
    TON: "UQDlS4rygl8h0pZDBXHbPCD5sf2TUU4ZaxbcnjTORd3AqDyi"
};
