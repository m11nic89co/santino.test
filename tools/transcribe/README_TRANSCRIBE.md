Локальная транскрипция микрофона — инструкция

Файлы:
- `mic_transcribe.py` — слушает микрофон кусками и транскрибирует (faster-whisper или whisper). Результат копируется в буфер обмена.
- `requirements.txt` — зависимости.
- `install_transcribe.ps1` — PowerShell helper для создания venv и установки зависимостей.

Быстрый старт (PowerShell):
1. Откройте терминал в папке проекта/tools/transcribe.
2. Запустите:
   .\install_transcribe.ps1
3. Активируйте окружение и запустите транскриптор:
   .\.venv\Scripts\Activate.ps1
   python mic_transcribe.py --duration 4 --model small --lang ru

Замечания:
- Для реального времени и больших моделей рекомендуется GPU (CUDA) и установка faster-whisper с поддержкой CUDA.
- Если хотите, могу установить зависимости автоматически (требуется разрешение на выполнение скриптов).
