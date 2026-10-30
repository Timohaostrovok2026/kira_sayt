#!/bin/bash
# Выкладка сайта на сервер.
#
#   ./scripts/deploy.sh
#
# Что делает:
#   1. Заливает код (без node_modules, .next, data, .env*) в /opt/ulybaysya/app.
#   2. Если менялся package-lock.json — собирает кэш npm-пакетов под Linux локально
#      и заливает его (с сервера npm-реестр недоступен).
#   3. Ставит пакеты из кэша, собирает сайт и перезапускает службу.
#
# База и загруженные фото живут на сервере в /var/lib/ulybaysya и НЕ перезаписываются:
# там правки Кирилла из админки, заявки и статистика.
set -euo pipefail

HOST="${DEPLOY_HOST:-root@195.133.73.111}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/ulybaysya_deploy}"
APP=/opt/ulybaysya/app
CACHE=/opt/ulybaysya/npmcache
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_CACHE="${TMPDIR:-/tmp}/ulybaysya-npmcache"

# Одно постоянное соединение: VPN иногда рвёт новые SSH-подключения.
SSH_OPTS=(-i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=25 -o ServerAliveInterval=15
  -o ControlMaster=auto -o ControlPath="$HOME/.ssh/cm-ulybaysya" -o ControlPersist=30m)
remote() { ssh "${SSH_OPTS[@]}" "$HOST" "$@"; }
push() { rsync -az -e "ssh ${SSH_OPTS[*]}" "$@"; }

echo "→ Соединение с $HOST"
for i in 1 2 3 4 5 6; do
  remote true 2>/dev/null && break
  [ "$i" = 6 ] && { echo "Не удалось подключиться к серверу"; exit 1; }
  sleep 5
done

echo "→ Код"
cd "$ROOT"
push --delete \
  --exclude /node_modules --exclude /.next --exclude /data --exclude '/.env*' \
  --exclude /tsconfig.tsbuildinfo --exclude /scripts/seed-stats.mjs \
  ./ "$HOST:$APP/"

LOCK_HASH=$(shasum -a 256 package-lock.json | cut -d' ' -f1)
if [ "$(remote "cat /opt/ulybaysya/.lockhash 2>/dev/null || true")" != "$LOCK_HASH" ]; then
  echo "→ Зависимости изменились: собираю кэш пакетов под Linux"
  STAGE=$(mktemp -d)
  cp package.json package-lock.json "$STAGE/"
  (cd "$STAGE" && npm ci --cache "$LOCAL_CACHE" --os=linux --cpu=x64 --libc=glibc \
    --ignore-scripts --no-audit --no-fund --loglevel=error)
  rm -rf "$STAGE"
  push --delete "$LOCAL_CACHE/" "$HOST:$CACHE/"
  remote "chown -R uly:uly $APP $CACHE && sudo -u uly -H bash -lc 'cd $APP && npm ci --offline --cache $CACHE --no-audit --no-fund --loglevel=error' && echo $LOCK_HASH > /opt/ulybaysya/.lockhash"
else
  remote "chown -R uly:uly $APP"
fi

echo "→ Сборка"
remote "sudo -u uly -H bash -lc 'cd $APP && set -a && . /etc/ulybaysya.env && set +a && npx next build 2>&1 | tail -4'"

# Сжатые копии фото кэшируются на месяц и сами не обновляются — сбрасываем при каждой выкладке,
# иначе заменённое под тем же именем фото из public/img показывалось бы старым. Прогрев ниже соберёт их заново.
remote "rm -rf $APP/.next/cache/images"

echo "→ Перезапуск"
remote "systemctl restart ulybaysya && sleep 5 && systemctl is-active ulybaysya && curl -s -o /dev/null -w 'сайт: %{http_code}\n' --max-time 20 http://127.0.0.1:3000/"
# Accept как у браузера: Next кэширует сжатое фото отдельно для каждого формата (webp/jpeg).
# Прогрев: сервер заранее сжимает крупные фото (первый экран, галерея) под все размеры экранов,
# чтобы первый посетитель не ждал. Ошибки прогрева выкладку не валят.
echo "→ Прогрев фото"
remote 'for p in / /pakety /kostyumy /sobrat; do curl -s --max-time 20 "http://127.0.0.1:3000$p"; done \
  | grep -o "/_next/image?url=[^\" ]*" | sed "s/&amp;/\&/g" | sort -u \
  | xargs -P 4 -I{} curl -s -o /dev/null --max-time 30 -H "Accept: image/avif,image/webp,*/*" "http://127.0.0.1:3000{}"; echo "  готово"' || true
echo "✓ Готово: https://195.133.73.111"
