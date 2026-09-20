/**
 * E2E Test: Fail2ban Regex Pattern Validation
 * Verifies entrypoint.sh contains correct failregex and ignoreregex patterns
 */

import { execInContainer } from "./shared-mocks.js";
import { CONTAINER_NAME } from "./shared-mocks.js";

async function testFail2banRegex() {
    const entrypointContent = await execInContainer(CONTAINER_NAME, "cat /entrypoint.sh");

    if (!entrypointContent.includes("[Definition]")) {
        throw new Error("entrypoint.sh should contain [Definition] section");
    }

    if (
        !entrypointContent.includes("failregex") ||
        !entrypointContent.includes("(407|403)") ||
        !entrypointContent.includes("<HOST>")
    ) {
        throw new Error("entrypoint.sh should have correct failregex pattern");
    }

    if (
        !entrypointContent.includes("ignoreregex") ||
        !entrypointContent.includes('"code":"00000"') ||
        !entrypointContent.includes('"code":"200"')
    ) {
        throw new Error("entrypoint.sh should have correct ignoreregex pattern");
    }
}

testFail2banRegex().catch((error) => {
    console.error("Fail2ban regex test failed:", error);
    process.exit(1);
});