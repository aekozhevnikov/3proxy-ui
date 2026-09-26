/**
 * E2E Test: Legitimate Traffic Ignored
 * Успешные запросы (код 00000) не должны приводить к бану IP.
 */
import { getFail2banStatus } from "../utils/helpers.js";
import { appendSuccess, sleep } from "./log-helper.js";
import { CONTAINER_NAME, LEGIT_IP } from "./shared-mocks.js";

const REQUESTS = 5;

export async function testLegitimateTrafficIgnored(): Promise<void> {
    // Заметно больше запросов, чем maxretry, — иначе проверка ничего не значит.
    for (let i = 0; i < REQUESTS; i++) {
        await appendSuccess();
        await sleep(300);
    }

    // Даём fail2ban время прочитать лог и обновить бан-лист.
    await sleep(10000);

    const status = await getFail2banStatus(CONTAINER_NAME);

    if (status.bannedIPs?.includes(LEGIT_IP)) {
        throw new Error(`Legitimate IP ${LEGIT_IP} should NOT be banned. Status: ${JSON.stringify(status)}`);
    }
}
