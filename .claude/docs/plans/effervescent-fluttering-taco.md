# План удаления Next.js и замены на чистый React

## Контекст
Пользователь хочет удалить все упоминания Next.js из фронтенда и оставить только чистый React. Текущий проект использует Next.js для роутинга, обработки изображений, тем и серверных функций, но нужно заменить их на эквиваленты из React ecosystem.

## Текущее состояние
Из исследования и анализа кода обнаружено следующее использование Next.js:

### Роутинг и навигация
- `useRouter()` из `next/navigation` - используется в `src/app/page.tsx` для перенаправления на `/login`
- `usePathname()` из `next/navigation` - используется в `src/components/side-menu.tsx` и `src/components/side-menu-drawer.tsx`
- `redirect()` из `next/navigation` - используется во множестве файлов в `src/app/admin/` и API routes
- `Link` из `next/link` - используется в `src/components/side-menu.tsx`, `src/components/side-menu-drawer.tsx`, `src/components/footer.tsx`

### Изображения
- `Image` из `next/image` - используется в `src/app/login/page.tsx`

### Темы
- `ThemeProvider` и `useTheme` из `next-themes` - используется в `src/app/providers.tsx`, `src/app/login/page.tsx`, `src/components/side-menu.tsx`, `src/components/side-menu-drawer.tsx`

### Серверные функции
- `NextResponse`, `NextRequest` из `next/server` - используется во всех API маршрутах в `src/app/api/`
- `cookies` из `next/headers` - используется в `src/app/api/auth/change-credentials/route.ts`, `src/app/api/auth/session/route.ts`
- `revalidatePath` из `next/cache` - используется в `src/core/actions/config.ts`, `src/core/actions/proxy-user.ts`

Дополнительно отмечено из исследования:
- Проект уже использует react-router-dom v7.17.0 для основного роутинга (в App.tsx)
- Есть несогласованность в использовании Link: некоторые компоненты используют next/link вместо react-router-dom Link
- Структура маршрутов уже определена в App.tsx с использованием react-router-dom

## Подход
1. Заменить роутинг Next.js на react-router-dom (уже установлен в зависимостях):
   - `useRouter()` → `useNavigate()` из react-router-dom
   - `usePathname()` → `useLocation()` из react-router-dom
   - `redirect()` → `navigate()` с заменой или использование `useNavigate()`
   - `Link` из next/link → `Link` из react-router-dom

2. Заменить next/image на обычный `<img>` тег:
   - Простой `<img>` с соответствующими атрибутами (src, alt, width, height, loading)
   - Удалить специфичные для next/image свойства como `loading="eager"`, `priority`, etc.

3. Заменить next/link на react-router-dom Link:
   - Заменить импорт `import Link from "next/link"` на `import { Link } from "react-router-dom"`
   - JSX остается тем же

4. Заменить next-themes на собственное решение с использованием React Context:
   - Создать ThemeContext для управления светлой/темной темой
   - Хранить предпочтения в localStorage
   - Добавить класс themes к body или root элементу через useEffect
   - Предоставить переключатель тем через контекст

5. Обработать серверные функции:
   - API маршруты в `src/app/api/` нужно оставить как есть, так как они являются частью бэкенда на Go
   - Убрать серверные специфичные импорты только из клиентского кода
   - Заменить `cookies()` на клиентское хранение токенов (localStorage или cookies через js-cookie)
   - Заменить `revalidatePath` на ручной вызов API endpoints или использование react-query для обновления данных

6. Убрать все серверные специфичные импорты из клиентского кода и заменить на клиентские эквиваленты

## Файлы для модификации
Основываясь на исследовании, следующие файлы требуют модификации:

### Роутинг и навигация
- `src/app/page.tsx` - замена useRouter на useNavigate
- `src/app/admin/page.tsx` - замена redirect
- `src/app/admin/profile/page.tsx` - замена redirect
- `src/app/admin/users/page.tsx` - замена redirect
- `src/app/admin/users/create/page.tsx` - замена redirect
- `src/app/admin/users/[id]/edit/page.tsx` - замена redirect
- `src/app/login/page.tsx` - замена useTheme и Image
- `src/app/providers.tsx` - замена ThemeProvider
- `src/components/side-menu.tsx` - замена usePathname, useTheme, Link
- `src/components/side-menu-drawer.tsx` - замена usePathname, useTheme, Link
- `src/components/footer.tsx` - замена Link

### Изображения
- `src/app/login/page.tsx` - замена Image на img
- `src/components/side-menu.tsx` - замена Image на img (если используется)
- `src/components/side-menu-drawer.tsx` - замена Image на img (если используется)

### Серверные функции в клиентском коде
- `src/core/actions/config.ts` - замена revalidatePath на вызов API или react-query invalidate
- `src/core/actions/proxy-user.ts` - замена revalidatePath на вызов API или react-query invalidate
- `src/core/session.ts` - проверить использование cookies (скорее всего серверное, оставить)
- `src/core/auth.ts` - проверить использование NextResponse (скорее всего серверное, оставить)

## Реализация шагов
1. Убедиться, что react-router-dom уже установлен (видно в package.json)
2. Установить js-cookie для работы с cookies в клиентском коде: `npm install js-cookie`
3. Создать файл `src/core/theme/ThemeContext.tsx` с реализацией контекста для тем
4. Обновить роутинг:
   - Заменить импорты next/navigation на react-router-dom
   - Обновить использование хуков и функций
   - Убедиться, что BrowserRouter обернут вокруг приложения (скорее всего уже есть в main.tsx или App.tsx)
5. Заменить компоненты:
   - next/image → img
   - next/link → react-router-dom Link
   - next-themes → собственный ThemeContext
6. Обновить действия, которые использовали revalidatePath:
   - Заменить на вызов соответствующих API endpoints
   - Или использовать react-query для инвалидации и обновления данных
7. Удалить все импорты next/* из клиентского кода
8. Обновить конфигурацию Vite если необходимо (добавить base: '/' или аналогичное для корректной работы роутинга)

## Верификация
- Запустить приложение в режиме разработки (`npm run dev`)
- Проверить, что все страницы загружаются корректно
- Проверить навигацию между страницами
- Проверить работу тем (светлая/темная) и сохранение предпочтений
- Проверить аутентификация и работу с proxy пользователями
- Убедиться, что нет ошибок в консоли связанных с отсутствующими Next.js модулями
- Проверить, что API запросы работают корректно
- Запустить тесты: `npm run test:unit`