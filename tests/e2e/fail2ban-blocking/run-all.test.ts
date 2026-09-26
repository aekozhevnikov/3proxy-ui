/**
 * E2E Test Runner: Fail2ban Blocking
 *
 * Brings the environment up once, runs the tests sequentially and counts
 * the result honestly. Returns the process exit code.
 */
import { pathToFileURL } from "url";

import { cleanup, setupEnvironment } from "./shared-mocks.js";
import { testFail2banRegex } from "./regex-validation.test.js";
import { testJailConfiguration } from "./jail-configuration.test.js";
import { testAuthFailureBanning } from "./auth-failure-banning.test.js";
import { testLegitimateTrafficIgnored } from "./legitimate-traffic-ignored.test.js";

const TESTS: { name: string; run: () => Promise<void> }[] = [
    { name: "Fail2ban Regex Pattern", run: testFail2banRegex },
    { name: "Jail Configuration", run: testJailConfiguration },
    { name: "Auth Failure Banning", run: testAuthFailureBanning },
    { name: "Legitimate Traffic Ignored", run: testLegitimateTrafficIgnored }
];

export async function runAll(): Promise<number> {
    let passed = 0;
    const failures: { name: string; error: unknown }[] = [];

    try {
        await setupEnvironment();
    } catch (error) {
        console.error("\nTest setup failed:", error instanceof Error ? error.message : String(error));
        await cleanup();

        return 1;
    }

    try {
        for (const test of TESTS) {
            const startedAt = Date.now();

            try {
                await test.run();
                passed++;
                console.log(`PASS ${test.name} (${Date.now() - startedAt}ms)`);
            } catch (error) {
                failures.push({ name: test.name, error });
                console.error(`FAIL ${test.name}:`, error instanceof Error ? error.message : String(error));
            }
        }
    } finally {
        await cleanup();
    }

    console.log(`\n${passed}/${TESTS.length} passed`);

    for (const failure of failures) {
        console.error(`\n--- ${failure.name} ---`);
        console.error(failure.error);
    }

    return failures.length === 0 ? 0 : 1;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
    runAll()
        .then((code) => process.exit(code))
        .catch((error) => {
            console.error("Runner failed:", error);
            process.exit(1);
        });
}
