param()
# Create venv and install deps
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -e .[dev]
Write-Host "Environment ready. Activate next time with: . .\.venv\Scripts\Activate.ps1"
