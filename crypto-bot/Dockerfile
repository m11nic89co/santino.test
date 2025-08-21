# Minimal slim image with Python
FROM python:3.11-slim

ENV PIP_NO_CACHE_DIR=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy project metadata and sources before installing in editable mode
COPY pyproject.toml /app/
COPY src/ /app/src/

RUN pip install --upgrade pip \
	&& (pip install -e .[dev] || pip install -e .)

ENTRYPOINT ["python", "-m", "cryptobot.engine.run_paper"]
