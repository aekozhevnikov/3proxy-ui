import { spawn } from "child_process";
import path from "path";

const serverPath = path.join(process.cwd(), ".next", "standalone", "server.js");
const child = spawn("node", [serverPath], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: {
        ...process.env,
        HOST: process.env.HOST || "0.0.0.0",
        HOSTNAME: process.env.HOSTNAME || "0.0.0.0"
    }
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
