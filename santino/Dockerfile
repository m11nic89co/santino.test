# Dockerfile for running the Santino probe in an isolated, reproducible container.
# Uses a Debian-based Node image, installs system Chromium and required libs for Puppeteer.

FROM node:20-bullseye-slim

# Install libraries needed by Chromium / Puppeteer
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libnss3 \
    libxss1 \
    libgbm1 \
    libatk1.0-0 \
    wget \
    gnupg \
  && rm -rf /var/lib/apt/lists/*

# Install Chromium from the Debian repo
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to reuse system Chromium (do not download another copy)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /workspace

# Copy only package manifests first for faster rebuilds
COPY package*.json ./

# Install dependencies (CI-style install)
RUN npm ci --unsafe-perm --no-audit --progress=false || npm install --unsafe-perm --no-audit --progress=false

# Copy repository
COPY . .

# Ensure screenshots/outgoing exists
RUN mkdir -p scripts/screenshots/outgoing

# Add entrypoint helper
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "scripts/bind-domain.mjs", "--probe"]
