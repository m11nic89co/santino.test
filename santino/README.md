# santino.test

Быстрый старт

- Открыть в браузере VS Code (всегда актуальная версия):
  - https://vscode.dev/github/m11nic89co/santino.test
- Открыть в Codespaces (облачный VS Code, одинаковая среда):
  - Используйте кнопку "Code" в GitHub → "Open with Codespaces".

Локально

- Откройте файл рабочей области `DEV.code-workspace`.
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

Скрипты

- build: сборка из src/ в public/ с минификацией CSS/JS и генерацией sitemap.xml.
- build:prod: прод-сборка (BUILD_ENV=prod), корректный robots.txt и og:url при заданном BASE_URL.
- archive: архивирует public/ в oldVersions/YYYY-MM-DD.zip.
- release: build:prod + archive.
- deploy: build:prod + SFTP деплой на ваш хостинг (настройте .env).

Деплой на российский хостинг (SFTP)

1. Скопируйте `.env.example` в `.env` и заполните:

- BASE_URL (например, https://example.ru)
- DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USER
- DEPLOY_PASS или DEPLOY_KEY_PATH
- DEPLOY_REMOTE_DIR (например, /var/www/santino)

2. Запустите `npm run deploy`.

Примечание: Workflow GitHub Pages собирает сайт в режиме prod с BASE_URL, чтобы og:url и sitemap были валидными.
