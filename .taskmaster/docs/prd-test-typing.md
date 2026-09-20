# PRD: Исправление типизационных ошибок в тестах

## Цель
Устранить все ошибки типизации, выявленные `tsc --noEmit`, в тестовом коде (tests/), чтобы сборка и проверка типов проходили чисто.

## Объем
Файлы: ~50 файлов в `tests/`. Ошибок: ~392 строк (~180 уникальных ошибок).

## Типы ошибок
1. **catch (unknown) → Error**: `error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Error'` — нужно кастовать или использовать `instanceof`.
2. **HttpResponse vs string**: `error TS2339: Property 'success' does not exist on type 'string | HttpResponse'` — функции возвращают `string | HttpResponse`, нужно типизировать возвращаемое значение или использовать type guards.
3. **Incomplete mocks**: объекты-заглушки не содержат всех полей типа (ProxyUser, AdminUser) — нужно использовать `Partial<T>` или `as` касты, либо расширить моки.
4. **jest.setup.ts**: `NODE_ENV` readonly — обойти через `Object.defineProperty` или `as any`.
5. **SystemStatus mismatch**: мок не соответствует типу — использовать `Partial<SystemStatus>`.
6. **Buffer vs string**: в тестах filter-regex — использовать `Buffer.from()`.

## Архитектурные решения
- Не менять типы в продакшене (src/), только тесты.
- Использовать минимальные касты (`as`) в тестах, а не переписывать логику.
- Создать общие типы-обёртки для HttpResponse в `tests/e2e/utils/helpers.ts`.
- `isHttpResponse` должен быть экспортирован из helpers.ts и использоваться как type guard.

## Последовательность задач
1. Исправить `jest.setup.ts` (NODE_ENV readonly).
2. Экспортировать `isHttpResponse` и исправить `user-api.ts` импорт.
3. Исправить `helpers.ts` — тип возвращаемого значения.
4. Исправить e2e тесты (traffic-limit, fail2ban-blocking) — catch/broadcast.
5. Исправить unit тесты — моки Prisma, Puppeteer, типы API.
6. Запустить `tsc --noEmit` и убедиться в 0 ошибках.
7. Запустить `npm run test:unit` — убедиться, что тесты проходят.
