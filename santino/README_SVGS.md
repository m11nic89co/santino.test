Добавлены плавающие SVG-макеты и демонстрация gallery_example.html

Файлы:
- santino/svgs/*.svg (5 новых макетов)
- santino/src/js/floating.js - логика: показывает минимум 3 уникальных макета, периодически обновляет
- santino/src/css/floating.css - базовый стиль
- santino/svgs/gallery_example.html - страница для быстрой проверки

Как проверить:
Откройте `santino/svgs/gallery_example.html` в браузере (относительные пути предполагают структуру репозитория).

Настройки:
- изменить количество одновременно видимых макетов: data-min на контейнере
- пути к svg можно править в `santino/src/js/floating.js`
