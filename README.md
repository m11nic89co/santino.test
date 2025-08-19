# santino.test

Быстрый старт
- Открыть в браузере VS Code (всегда актуальная версия):
  - https://vscode.dev/github/m11nic89co/santino.test
- Открыть в Codespaces (облачный VS Code, одинаковая среда):
  - Используйте кнопку "Code" в GitHub → "Open with Codespaces".

Локально
- Откройте файл рабочей области `santino.code-workspace`.
- Включите Settings Sync и войдите в GitHub.
- Git auto fetch включён; при старте будет актуальный код.

Сборка
- Test: `npm run build`
- Prod: `npm run build:prod` (можно добавить BASE_URL)
- Архив: `npm run archive` (создаст ZIP в `oldVersions`)

CI/CD
- GitHub Pages: автосборка из `src` в `public` и публикация.
- Daily ZIP: плановый workflow создаёт архив сборки и прикрепляет как artifact.

Devcontainer
- Для Codespaces/Dev Containers настроен Node 20 и автозагрузка зависимостей.
