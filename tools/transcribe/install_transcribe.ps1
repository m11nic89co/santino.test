# PowerShell helper: создаёт venv и устанавливает зависимости для mic_transcribe.py
python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install --upgrade pip; pip install -r requirements.txt
Write-Output "Готово. Для запуска: .\.venv\Scripts\Activate.ps1; python mic_transcribe.py --duration 4 --model small --lang ru"
