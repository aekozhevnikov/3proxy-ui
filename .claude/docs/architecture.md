---
type: instructions
priority: medium
description: "Инструкции по анализу архитектуры проекта через codebase-memory-mcp"
---

# Архитектура проекта

## Получение архитектуры через codebase-memory-mcp

Для анализа архитектуры проекта используй MCP сервер codebase-memory-mcp:

1. **Индексация репозитория** — `mcp__codebase-memory-mcp__index_repository` для создания knowledge graph (один раз, затем кэшируется)
2. **Получение обзора** — `mcp__codebase-memory-mcp__get_architecture` для получения высокоуровневого обзора проекта
3. **Поиск по графу** — `mcp__codebase-memory-mcp__search_graph` для поиска функций, классов, маршрутов
4. **Анализ влияния** — `mcp__codebase-memory-mcp__detect_changes` для определения blast radius изменений
5. **Трассировка путей** — `mcp__codebase-memory-mcp__trace_path` для отслеживания вызовов между символами

### Ключевые аспекты архитектурного анализа
- **clusters** — обнаружение de-facto модулей через Leiden community detection
- **cycles** — поиск циклических зависимостей в call graph
- **hotspots** — выявление узких мест по сложности (cyclomatic, cognitive, loop_depth)
- **boundaries** — анализ слоев и границ между компонентами

## Структура проекта

