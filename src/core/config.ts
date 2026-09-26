import { z } from "zod";

const appConfigSchema = z.object({
    name: z.string().default("3proxy UI"),
    description: z.string().default("Admin panel for 3proxy"),
    url: z.string().default("http://localhost:3000"),
    jwtSecret: z.string().min(32)
});

// Fallback JWT secret for development if not set (not for production!)
const jwtSecret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-secret-key-min-32-characters-long" : undefined);

export const app = appConfigSchema.parse({
    name: process.env.APP_NAME || "3proxy UI",
    description: process.env.APP_DESCRIPTION || "Admin panel for 3proxy",
    url: process.env.APP_URL || "http://localhost:3000",
    jwtSecret
});
