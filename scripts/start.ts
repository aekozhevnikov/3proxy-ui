import { spawn } from "child_process";
import path from "path";
import { execSync } from "child_process";

console.log("🔧 Initializing database...");

try {
    // Run Prisma migrate deploy to apply migrations
    console.log("   Running database migrations...");
    execSync("npx prisma migrate deploy", { cwd: process.cwd(), stdio: "inherit" });

    // Run seed to create default admin user if not exists
    console.log("   Seeding default admin user...");
    execSync("npx prisma db seed", { cwd: process.cwd(), stdio: "inherit" });
} catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
}

console.log("✅ Database initialized");
console.log("🚀 Starting 3proxy-ui server...");

const serverPath = path.join(process.cwd(), ".next", "standalone", "server.js");
const child = spawn("node", [serverPath], {
    stdio: "inherit",
    cwd: process.cwd()
});

// Forward signals
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGQUIT", () => child.kill("SIGQUIT"));

child.on("close", (code) => {
    process.exit(code || 0);
});

child.on("error", (err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
