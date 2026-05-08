#!/usr/bin/env node

/**
 * Main E2E Test Runner
 *
 * Provides a unified entry point for all E2E tests
 * Usage: npx tsx tests/e2e/index.ts [test-name]
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests: Record<string, { file: string; description: string }> = {
    traffic: {
        file: "traffic-limit.test.ts",
        description: "Test traffic limit enforcement and user deactivation"
    },
    fail2ban: {
        file: "fail2ban-blocking.test.ts",
        description: "Test fail2ban IP blocking and iptables rules"
    },
    all: {
        file: "all",
        description: "Run all E2E tests"
    }
};

function printUsage() {
    console.debug("\nE2E Test Runner for 3proxy-ui");
    console.debug("================================\n");
    console.debug("Usage: npm run test:e2e [test-name]\n");
    console.debug("Available tests:");
    for (const [name, test] of Object.entries(tests)) {
        console.debug(`  ${name.padEnd(12)} - ${test.description}`);
    }
    console.debug("\nExamples:");
    console.debug('  npm run test:e2e          # Run all tests (same as "all")');
    console.debug("  npm run test:e2e traffic  # Run only traffic limit tests");
    console.debug("  npm run test:e2e fail2ban # Run only fail2ban tests");
    console.debug("");
}

async function runTest(testName: string): Promise<number> {
    const test = tests[testName];

    if (!test) {
        console.error(`Unknown test: ${testName}`);
        console.error(`Available tests: ${Object.keys(tests).join(", ")}`);
        return 1;
    }

    if (testName === "all") {
        console.debug("Running all E2E tests...\n");

        // First run the centralized test file
        console.debug("┌──────────────────────────────────────┐");
        console.debug("│ 1/2 Traffic Limit Tests              │");
        console.debug("└──────────────────────────────────────┘");
        const result1 = await runTsx("traffic-limit.test.ts");

        if (result1 !== 0) {
            console.debug("\n❌ Traffic limit tests failed, aborting");
            return result1;
        }

        console.debug("\n┌──────────────────────────────────────┐");
        console.debug("│ 2/2 Fail2ban Blocking Tests          │");
        console.debug("└──────────────────────────────────────┘");
        const result2 = await runTsx("fail2ban-blocking.test.ts");

        if (result2 !== 0) {
            console.debug("\n❌ Fail2ban tests failed");
            return result2;
        }

        console.debug("\n✅ All E2E tests passed!");
        return 0;
    } else {
        console.debug(`Running ${testName} test...`);
        return await runTsx(test.file);
    }
}

async function runTsx(filename: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const filepath = path.join(__dirname, filename);
        const child = spawn("npx", ["tsx", filepath], {
            stdio: "inherit",
            env: {
                ...process.env,
                NODE_OPTIONS: process.env.NODE_OPTIONS || ""
            }
        });

        child.on("close", (code) => {
            resolve(code ?? 1);
        });

        child.on("error", (error) => {
            console.error("Failed to start test process:", error);
            reject(error);
        });
    });
}

// Main
const args = process.argv.slice(2);
const testName = args[0] || "all";

if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
}

runTest(testName)
    .then((code) => {
        process.exit(code);
    })
    .catch((error) => {
        console.error("Test runner failed:", error);
        process.exit(1);
    });
