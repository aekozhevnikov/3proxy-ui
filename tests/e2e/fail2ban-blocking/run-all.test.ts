/**
 * E2E Test Runner: Fail2ban Blocking
 * Orchestrates all fail2ban-blocking E2E tests with proper setup and cleanup
 */

import { setupEnvironment, cleanup } from "./shared-mocks.js";
import "./regex-validation.test.ts";
import "./auth-failure-banning.test.ts";
import "./legitimate-traffic-ignored.test.ts";
import "./jail-configuration.test.ts";

async function runAllTests() {
    let passed = 0;
    let failed = 0;
    const errors: Error[] = [];

    try {
        await setupEnvironment();

        const tests = [
            "Fail2ban Regex Pattern",
            "Auth Failure Banning",
            "Legitimate Traffic Ignored",
            "Jail Configuration"
        ];
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("\n❌ Test setup failed:", message);
        failed++;
        errors.push(error instanceof Error ? error : new Error(String(error)));
    } finally {
        await cleanup();
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
