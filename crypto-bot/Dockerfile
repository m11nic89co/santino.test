# Minimal slim image with Python
FROM python:3.11-slim

ENV PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY pyproject.toml /app/
RUN pip install --upgrade pip && pip install -e .[dev] || pip install -e .

COPY src/ /app/src/

ENTRYPOINT ["python", "-m", "cryptobot.engine.run_paper"]
