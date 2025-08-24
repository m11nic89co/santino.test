# Santino probe — Docker instructions

This README explains how to build and run the Santino probe inside Docker so the environment is reproducible and Chromium is not downloaded into a cloud-synced folder.

Prerequisites
- Docker installed on your machine (Docker Desktop on Windows)
- Optional: sufficient disk space for Chromium and node modules

Build
Open PowerShell and run (from repository root):

```powershell
Set-Location -Path 'G:\My Drive\dev\santino'
docker build -t santino-probe .
```

Run (mount workspace so outputs are written to your host):

```powershell
# Run with current user id mapping (replace with actual UID if needed on Linux)
docker run --rm -v 'G:\My Drive\dev\santino:C:\workspace' -w C:\workspace santino-probe
```

Notes and flags
- The image uses system Chromium and sets PUPPETEER_SKIP_CHROMIUM_DOWNLOAD to skip the download in npm install.
- If Docker Desktop is unavailable on Windows, use WSL2 or a cloud VM (see alternatives below).
- The container writes capture files to `scripts/screenshots/outgoing` on the host.

Alternatives
- If you prefer not to run headless Chromium in the container, you can run Chrome locally and connect Puppeteer to it via remote-debugging port (faster iteration).
- If you only need payloads, export HAR from DevTools or run mitmproxy locally and perform actions in your normal browser.

Security
- Remove or move `scripts/creds.local.json` out of the repo before building the image. The `.dockerignore` already excludes it from the image, but keep secrets off the workspace when sharing.

If you want, I can:
- create a small helper PowerShell script to build and run with sensible defaults,
- or prepare a `docker-compose.yml` for more advanced cases.
