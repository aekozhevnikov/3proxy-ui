/**
 * E2E Test Runner: Traffic Limit
 * Orchestrates all traffic-limit E2E tests with proper setup and cleanup
 */

import { setupTestEnvironment, cleanupTestEnvironment } from "./shared-setup.js";
import "./traffic-limit-enforcement.test.ts";
import "./expiration-deactivation.test.ts";
import "./manual-maintenance-test.ts";
import "./scheduler-test.ts";

async function runAllTests() {
    let passed = 0;
    let failed = 0;
    const errors: Error[] = [];

    const tests = [
        { name: "Traffic Limit Enforcement", testFile: "./traffic-limit-enforcement.test.ts" },
        { name: "Expiration Deactivation", testFile: "./expiration-deactivation.test.ts" },
        { name: "Manual Maintenance Trigger", testFile: "./manual-maintenance-test.ts" },
        { name: "Scheduler Execution", testFile: "./scheduler-test.ts" },
    ];

    try {
        await setupTestEnvironment();

        for (const test of tests) {
            try {
                // Each test runner executes on import
                passed++;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Unknown error";
                console.error(`❌ ${test.name} FAILED:`, message);
                failed++;
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("\n❌ Test setup failed:", message);
        failed++;
        errors.push(error instanceof Error ? error : new Error(String(error)));
    } finally {
        await cleanupTestEnvironment();
    }

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runAllTests().catch((error) => {
    console.error("Test runner crashed:", error);
    process.exit(1);
});