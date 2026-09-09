#!/bin/bash
# Write deploy/.env — single source of truth for all containers.

write_deploy_env() {
  local deploy_dir="${1:-/opt/fratelanza-office/deploy}"

  POSTGRES_PASSWORD=$(printf '%s' "${POSTGRES_PASSWORD}" | tr -d '\r\n')
  SECRET_KEY=$(printf '%s' "${SECRET_KEY}" | tr -d '\r\n')
  ADMIN_PASSWORD=$(printf '%s' "${ADMIN_PASSWORD}" | tr -d '\r\n')
  ADMIN_USERNAME=$(printf '%s' "${ADMIN_USERNAME:-admin}" | tr -d '\r\n')

  cat > "${deploy_dir}/.env" <<EOF
POSTGRES_USER=office
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=fratelanza_office
SECRET_KEY=${SECRET_KEY}
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_NAME=System Admin
ADMIN_EMAIL=
FRONTEND_PORT=127.0.0.1:16360
BACKEND_PORT=127.0.0.1:16361
CORS_ORIGINS=https://nividia.fratelanza.com,http://nividia.fratelanza.com
NEXT_PUBLIC_API_URL=https://nividia.fratelanza.com
SEED_DEMO_DATA=false
EOF
  chmod 600 "${deploy_dir}/.env"
}

generate_secrets() {
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  SECRET_KEY=$(openssl rand -hex 32)
  ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
  ADMIN_PASSWORD="Office$(openssl rand -hex 4)"
}

load_or_create_secrets() {
  local secrets_file="${1:-/opt/fratelanza-office/deploy/.secrets}"

  if [ -f "${secrets_file}" ]; then
    POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "${secrets_file}" | cut -d= -f2- | tr -d '\r\n')
    SECRET_KEY=$(grep '^SECRET_KEY=' "${secrets_file}" | cut -d= -f2- | tr -d '\r\n')
    ADMIN_PASSWORD=$(grep '^ADMIN_PASSWORD=' "${secrets_file}" | cut -d= -f2- | tr -d '\r\n')
    ADMIN_USERNAME=$(grep '^ADMIN_USERNAME=' "${secrets_file}" | cut -d= -f2- | tr -d '\r\n')
    ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
    return 0
  fi

  generate_secrets
}

save_secrets() {
  local secrets_file="${1:-/opt/fratelanza-office/deploy/.secrets}"
  mkdir -p "$(dirname "${secrets_file}")"
  cat > "${secrets_file}" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
SECRET_KEY=${SECRET_KEY}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_USERNAME=${ADMIN_USERNAME}
EOF
  chmod 600 "${secrets_file}"
}
