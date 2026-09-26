/**
 * E2E Test: Fail2ban Blocking
 *
 * Точка входа сохранена для `npm run test:e2e:fail2ban`.
 * Реализация вынесена в ./fail2ban-blocking/ — там же лежат отдельные тесты.
 */
import { runAll } from "./fail2ban-blocking/run-all.test.js";

runAll()
    .then((code) => process.exit(code))
    .catch((error) => {
        console.error("E2E fail2ban test failed:", error);
        process.exit(1);
    });
