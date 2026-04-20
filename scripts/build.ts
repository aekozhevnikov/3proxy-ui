import * as fs from "fs";
import * as path from "path";

import { runCommand } from "./utils.js";

const copyDir = (src: string, dest: string) => {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};

const main = async () => {
    try {
        await runCommand("next", ["build"]);

        const standaloneDir = path.join(process.cwd(), ".next", "standalone");
        const publicDest = path.join(standaloneDir, "public");
        const staticDest = path.join(standaloneDir, ".next", "static");

        // Copy public directory if it exists
        const publicSrc = path.join(process.cwd(), "public");

        if (fs.existsSync(publicSrc)) {
            copyDir(publicSrc, publicDest);
        }

        // Copy .next/static directory if it exists
        const staticSrc = path.join(process.cwd(), ".next", "static");

        if (fs.existsSync(staticSrc)) {
            copyDir(staticSrc, staticDest);
        }
    } catch (error) {
        console.error("Failed to build:", error);
        process.exit(1);
    }
};

main().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
});
