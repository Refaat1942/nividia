#!/bin/bash
# Run from your LOCAL machine (with SSH access to VPS)
# Usage: bash deploy/vps-upload-and-deploy.sh

VPS="root@187.124.15.14"
INSTALL_DIR="/opt/fratelanza-office"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Uploading to VPS..."
rsync -avz --exclude node_modules --exclude .next --exclude __pycache__ --exclude .git \
  "$PROJECT_DIR/" "$VPS:$INSTALL_DIR/"

echo "Deploying on VPS..."
ssh "$VPS" "cd $INSTALL_DIR/deploy && bash pre-deploy-check.sh && bash deploy.sh"

echo "Done. Check: ssh $VPS 'curl -s http://127.0.0.1:16361/health'"
