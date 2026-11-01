#!/bin/bash
# Первичная настройка чистого сервера Ubuntu 24.04 под сайт «Улыбайся». Запускать с Mac:
#
#   DEPLOY_HOST=root@НОВЫЙ_IP ./scripts/setup-server.sh /путь/к/node-v24.*-linux-x64.tar.xz /путь/к/caddy
#
# Node и Caddy везём файлами: с серверов Timeweb nodejs.org и реестр npm не открываются.
# Скрипт можно запускать повторно — ничего не ломает и не перезаписывает /etc/ulybaysya.env и базу.
# После него: заполнить /etc/ulybaysya.env (секреты — только владелец), затем ./scripts/deploy.sh.
set -euo pipefail

HOST="${DEPLOY_HOST:?укажите DEPLOY_HOST=root@IP}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/ulybaysya_deploy}"
NODE_TAR="${1:?путь к node-v24.x-linux-x64.tar.xz}"
CADDY_BIN="${2:?путь к бинарнику caddy (linux amd64)}"
IP="${HOST#*@}"
HERE="$(cd "$(dirname "$0")" && pwd)"
STAGE="$(mktemp -d)"

SSH_OPTS=(-i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=25 -o ServerAliveInterval=15
  -o StrictHostKeyChecking=accept-new
  -o ControlMaster=auto -o ControlPath="$HOME/.ssh/cm-ulybaysya-setup" -o ControlPersist=30m)
remote() { ssh "${SSH_OPTS[@]}" "$HOST" "$@"; }

echo "→ Соединение с $HOST"
remote true

echo "→ Файлы: Node, Caddy, конфиги"
remote 'mkdir -p /root/setup'
sed "s/__SERVER_IP__/$IP/" "$HERE/server/Caddyfile" > "$STAGE/Caddyfile"
scp "${SSH_OPTS[@]}" -q "$NODE_TAR" "$HOST:/root/setup/node.tar.xz"
scp "${SSH_OPTS[@]}" -q "$CADDY_BIN" "$HOST:/root/setup/caddy"
scp "${SSH_OPTS[@]}" -q "$STAGE/Caddyfile" "$HERE/server/ulybaysya.service" "$HERE/server/caddy.service" "$HOST:/root/setup/"

echo "→ Настройка на сервере"
remote 'bash -s' <<'REMOTE'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "  пакеты (sqlite3 для копий, ufw)"
apt-get -qq update && apt-get -qq install -y sqlite3 ufw ca-certificates >/dev/null

echo "  Node"
if ! /usr/local/bin/node -v 2>/dev/null | grep -q '^v24'; then
  tar -xJf /root/setup/node.tar.xz -C /usr/local --strip-components=1
fi
/usr/local/bin/node -v

echo "  пользователь uly и папки"
id uly >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/uly --shell /bin/bash uly
mkdir -p /opt/ulybaysya/app /opt/ulybaysya/npmcache /var/lib/ulybaysya /var/backups/ulybaysya
chown -R uly:uly /opt/ulybaysya /var/lib/ulybaysya /var/backups/ulybaysya
chmod 750 /var/lib/ulybaysya; chmod 700 /var/backups/ulybaysya

echo "  настройки сайта /etc/ulybaysya.env (секреты заполняет владелец)"
if [ ! -f /etc/ulybaysya.env ]; then
  cat > /etc/ulybaysya.env <<'ENV'
NEXT_PUBLIC_SITE_URL=https://ulybajsja.online
DATA_DIR=/var/lib/ulybaysya
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
STATS_PASSWORD=
NEXT_PUBLIC_YM_ID=
ENV
fi
chown root:uly /etc/ulybaysya.env; chmod 640 /etc/ulybaysya.env

echo "  Caddy"
id caddy >/dev/null 2>&1 || useradd --system --home /var/lib/caddy --create-home --shell /usr/sbin/nologin caddy
install -m 755 /root/setup/caddy /usr/local/bin/caddy
mkdir -p /etc/caddy && install -m 644 /root/setup/Caddyfile /etc/caddy/Caddyfile
/usr/local/bin/caddy validate --config /etc/caddy/Caddyfile >/dev/null
install -m 644 /root/setup/caddy.service /etc/systemd/system/caddy.service
install -m 644 /root/setup/ulybaysya.service /etc/systemd/system/ulybaysya.service
systemctl daemon-reload
systemctl enable --now caddy >/dev/null
systemctl enable ulybaysya >/dev/null   # запустится после первой выкладки

echo "  копии: cron 03:30 МСК (скрипт приедет с выкладкой)"
cat > /etc/cron.d/ulybaysya-backup <<'CRON'
30 0 * * * uly /opt/ulybaysya/app/scripts/backup.sh >> /var/log/ulybaysya-backup.log 2>&1
CRON
touch /var/log/ulybaysya-backup.log && chown uly:uly /var/log/ulybaysya-backup.log

echo "  вход только по ключу"
cat > /etc/ssh/sshd_config.d/00-ulybaysya-keys-only.conf <<'SSHD'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
SSHD
sshd -t && systemctl reload ssh

echo "  ufw: 22, 80, 443; UDP 443 — reject (HTTP/3 выключен)"
ufw default deny incoming >/dev/null; ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw status | grep -q "443/udp.*REJECT" || ufw reject 443/udp comment "QUIC off: reject fast so Safari falls back" >/dev/null
ufw --force enable >/dev/null
ufw status | grep -E "443|80|OpenSSH" | head -4
systemctl is-active caddy
REMOTE

echo "✓ Сервер настроен. Дальше: заполнить /etc/ulybaysya.env, затем DEPLOY_HOST=$HOST ./scripts/deploy.sh"
