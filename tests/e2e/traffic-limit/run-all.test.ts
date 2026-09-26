/**
 * E2E Test Runner: Traffic Limit
 *
 * Поднимает окружение один раз, выполняет тесты последовательно и честно
 * считает результат: упавший тест идёт в failed и не маскируется следующими.
 * Возвращает код выхода процесса.
 */
import { pathToFileURL } from "url";

import { cleanupTestEnvironment, setupTestEnvironment } from "./shared-setup.js";
import { testRealProxyTraffic } from "./real-proxy-traffic-test.js";
import { testTrafficLimitEnforcement } from "./traffic-limit-enforcement.test.js";
import { testExpirationDeactivation } from "./expiration-deactivation.test.js";
import { testManualMaintenanceTrigger } from "./manual-maintenance-test.js";
import { testScheduler } from "./scheduler-test.js";

const TESTS: { name: string; run: () => Promise<void> }[] = [
    { name: "Real Proxy Traffic", run: testRealProxyTraffic },
    { name: "Traffic Limit Enforcement", run: testTrafficLimitEnforcement },
    { name: "Expiration Deactivation", run: testExpirationDeactivation },
    { name: "Manual Maintenance Trigger", run: testManualMaintenanceTrigger },
    { name: "Scheduler Execution", run: testScheduler }
];

export async function runAll(): Promise<number> {
    let passed = 0;
    const failures: { name: string; error: unknown }[] = [];

    try {
        await setupTestEnvironment();
    } catch (error) {
        console.error("\nTest setup failed:", error instanceof Error ? error.message : String(error));
        await cleanupTestEnvironment();

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
        await cleanupTestEnvironment();
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
