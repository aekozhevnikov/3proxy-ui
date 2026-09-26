// Shared setup/cleanup for traffic-limit E2E tests
//
// Окружение описано в tests/e2e/docker-compose.e2e.yml, управляется через
// utils/environment.ts — здесь только адаптация к API остальных тестов набора.

import {
    apiCall,
    createAdminSession,
    execAsync,
    execInContainer,
    TEST_CONFIG,
    waitForService,
} from "../utils/helpers.js";
import {
    downService,
    resetRuntimeState,
    teardown,
    TRAFFIC_CONTAINER,
    TRAFFIC_SERVICE,
    upService,
} from "../utils/environment.js";
import { UserApiClient } from "../utils/user-api.js";

const CONTAINER_NAME = TRAFFIC_CONTAINER;

/** Поднимает стек traffic-набора и дожидается готовности API и админ-сессии. */
export async function setupTestEnvironment() {
    await upService(TRAFFIC_SERVICE);

    console.log("Waiting for service to be ready...");
    await waitForService(TEST_CONFIG.apiUrl, 180000);
    console.log("Service is ready!");

    // entrypoint.sh создаёт админа (admin/admin) и прогоняет миграции,
    // поэтому достаточно дождаться успешного логина.
    await waitForAdminSession();

    await warmUpBackgroundTasks();
}

/**
 * Фоновые задачи, включая планировщик maintenance, стартуют при первом
 * рендере корневого layout — то есть при первом запросе к странице. Тесты
 * работают только через API, поэтому layout не рендерится и планировщик
 * молча не запускается. Один GET / его запускает.
 */
async function warmUpBackgroundTasks(): Promise<void> {
    const deadline = Date.now() + 60000;
    let lastStatus = 0;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${TEST_CONFIG.apiUrl}/`, { signal: AbortSignal.timeout(30000) });

            if (response.ok) {
                // Даём время зарегистрировать cron-задачу и выполнить первый прогон.
                await new Promise((resolve) => setTimeout(resolve, 3000));

                return;
            }

            lastStatus = response.status;
        } catch (error) {
            lastStatus = 0;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(
        `Warm-up request to ${TEST_CONFIG.apiUrl}/ never succeeded (last status: ${lastStatus}). ` +
            "Фоновые задачи, включая планировщик maintenance, запускаются только при рендере страницы."
    );
}

/** Админ появляется не сразу: /api/auth/login начинает отвечать после setup.js. */
async function waitForAdminSession(timeout = 60000): Promise<void> {
    const startTime = Date.now();
    let lastError: unknown;

    while (Date.now() - startTime < timeout) {
        try {
            await createAdminSession();

            return;
        } catch (error) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }

    throw new Error(
        `Admin session not available after ${timeout}ms: ${
            lastError instanceof Error ? lastError.message : String(lastError)
        }`
    );
}

export async function cleanupTestEnvironment() {
    await downService(TRAFFIC_SERVICE);
    await teardown();
    console.log("Test environment cleaned up");
}

/**
 * Удаляет пользователя, если он остался с прошлого прогона: createProxyUser
 * падает на дубликате имени. deleteUser в API принимает id, а не имя.
 */
export async function removeUserIfExists(users: UserApiClient, username: string): Promise<void> {
    const all = await users.listUsers();
    const existing = all.find((user) => user.username === username);

    if (existing) {
        await users.deleteUser(existing.id);
    }
}

export {
    CONTAINER_NAME,
    UserApiClient,
    apiCall,
    createAdminSession,
    execAsync,
    execInContainer,
    resetRuntimeState,
    TEST_CONFIG,
};
