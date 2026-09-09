#!/bin/bash
# Upload Nividia contract template to the running system
# Usage: bash upload-contract-template.sh /path/to/عقد\ نفيديا\ المحدث\ 2026.docx
set -e

INSTALL_DIR="/opt/fratelanza-office"
TEMPLATE_SRC="${1:-${INSTALL_DIR}/deploy/templates/nividia-contract-2026.docx}"
DEPLOY_DIR="${INSTALL_DIR}/deploy"

if [ ! -f "${TEMPLATE_SRC}" ]; then
  echo "ERROR: Template not found: ${TEMPLATE_SRC}"
  echo "Copy your file first:"
  echo "  cp '/path/to/عقد نفيديا المحدث 2026.docx' ${INSTALL_DIR}/deploy/templates/nividia-contract-2026.docx"
  exit 1
fi

mkdir -p "${DEPLOY_DIR}/templates"
cp "${TEMPLATE_SRC}" "${DEPLOY_DIR}/templates/nividia-contract-2026.docx"

echo "Restarting backend to register template..."
cd "${DEPLOY_DIR}"
docker compose --env-file .env restart backend

echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:16361/health >/dev/null 2>&1; then
    echo ""
    echo "============================================"
    echo "  Template copied!"
    echo "  Open: https://nividia.fratelanza.com/contracts"
    echo "  Tab: القوالب والحقول"
    echo "  Or upload again via: رفع قالب"
    echo "============================================"
    exit 0
  fi
  sleep 2
done

echo "Backend not ready yet — template file is in deploy/templates/"
echo "Restart backend manually if needed."
