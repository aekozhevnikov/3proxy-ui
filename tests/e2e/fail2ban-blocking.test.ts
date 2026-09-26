/**
 * E2E Test: Fail2ban Blocking
 *
 * Entry point kept for `npm run test:e2e:fail2ban`.
 * The implementation lives in ./fail2ban-blocking/, where the individual tests are.
 */
import { runAll } from "./fail2ban-blocking/run-all.test.js";

runAll()
    .then((code) => process.exit(code))
    .catch((error) => {
        console.error("E2E fail2ban test failed:", error);
        process.exit(1);
    });
