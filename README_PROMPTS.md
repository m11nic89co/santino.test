# Управление промптами Copilot/сниппетами

Как подготовить и синхронизировать:

1) Положите в корень репозитория файл `prompts.json` (структура гибкая):
   - Вариант A: { "prompts": [ { "name": "Build", "body": "..." }, ... ] }
   - Вариант B: { "Build": "...", "Fix": "..." }
   - Вариант C: { "Build": { "body": "..." } }

2) Импорт (Windows):
   - Задача VS Code: "Santino: Import Copilot Prompts"
   - Или вручную: PowerShell
     powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-prompts.ps1 -Source prompts.json

3) Импорт (macOS/Linux):
   - Задача VS Code: "Santino: Import Copilot Prompts (macOS/Linux)"
   - Или:
     bash scripts/import-prompts.sh prompts.json

Результат:
- Копия сохраняется в `.local/copilot/prompts.json` (локально для машины)
- Формируются сниппеты VS Code: `.vscode/copilot-prompts.code-snippets`

Автообновление:
- После `git pull/merge` хук `post-merge` попытается обновить сниппеты из `prompts.json`.

Примечания:
- Сам `prompts.json` можно коммитить, если хотите делиться с командой. Если держать приватно — переименуйте в `prompts.local.json` (он игнорируется) и указывайте `-Source prompts.local.json`.
- Схему JSON можно адаптировать — скрипт пытается распознать распространенные формы.
