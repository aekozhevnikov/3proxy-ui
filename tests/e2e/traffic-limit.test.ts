/**
 * E2E Test: Traffic Limit
 *
 * Entry point kept for `npm run test:e2e` and tests/e2e/verify-setup.sh.
 * The implementation lives in ./traffic-limit/, where the individual tests are.
 */
import { runAll } from "./traffic-limit/run-all.test.js";

runAll()
    .then((code) => process.exit(code))
    .catch((error) => {
        console.error("E2E traffic limit test failed:", error);
        process.exit(1);
    });
