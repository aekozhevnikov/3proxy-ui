/**
 * E2E Test: Traffic Limit
 *
 * Точка входа сохранена для `npm run test:e2e` и tests/e2e/verify-setup.sh.
 * Реализация вынесена в ./traffic-limit/ — там же лежат отдельные тесты.
 */
import { runAll } from "./traffic-limit/run-all.test.js";

runAll()
    .then((code) => process.exit(code))
    .catch((error) => {
        console.error("E2E traffic limit test failed:", error);
        process.exit(1);
    });
