#!/usr/bin/env bash
set -e

# ================================================================
# Auto-deploy script for the Hostinger VPS
# Pulls latest code from GitHub and rebuilds Docker containers.
# Triggered either by GitHub Actions (webhook) or manually.
# ================================================================

APP_DIR="/usr/rudra"

cd "$APP_DIR"

# 1. Pull the latest code
echo "[deploy] Pulling latest code..."
git pull origin main

# 2. Rebuild and restart containers (backend rebuilds on code change)
echo "[deploy] Rebuilding Docker containers..."
docker compose up -d --build

# 3. Wait for services to become healthy
echo "[deploy] Waiting for services to stabilize..."
sleep 15

# 4. Check status
echo "[deploy] Container status:"
docker compose ps

echo "[deploy] Deployment complete."