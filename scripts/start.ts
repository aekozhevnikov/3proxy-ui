import { spawn } from "child_process";
import path from "path";

const serverPath = path.join(process.cwd(), ".next", "standalone", "server.js");
const child = spawn("node", [serverPath], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: {
        ...process.env,
        HOST: "0.0.0.0",
        // Next's standalone server binds to HOSTNAME, and Docker sets that to
        // the container id, so the old `process.env.HOSTNAME || "0.0.0.0"`
        // fallback never fired and the server listened only on the container's
        // bridge address, leaving the loopback self-calls in the panel refused.
        // Set it outright here rather than in the image: a platform that
        // re-injects HOSTNAME (ECS, Fargate) can override an image ENV, but not
        // this.
        HOSTNAME: "0.0.0.0"
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
