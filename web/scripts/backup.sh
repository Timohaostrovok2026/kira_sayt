#!/bin/bash
# Ежедневная копия боевой базы и загруженных фото. На сервере его запускает cron
# от пользователя uly (/etc/cron.d/ulybaysya-backup), вручную:
#
#   sudo -u uly /opt/ulybaysya/app/scripts/backup.sh
#
# Копия — один архив ulybaysya-ГГГГ-ММ-ДД.tar.gz в /var/backups/ulybaysya, хранится 14 последних,
# и он же уходит в Яндекс Облако, если настроены ключи (см. ниже).
# Внутри site.db (снимок через SQLite .backup — безопасно при работающем сайте, база только читается)
# и папка uploads/ с фото из админки.
set -euo pipefail

DATA="${DATA_DIR:-/var/lib/ulybaysya}"
OUT="${BACKUP_DIR:-/var/backups/ulybaysya}"
KEEP=14

umask 077 # в базе заявки с телефонами клиентов — копии видит только владелец
mkdir -p "$OUT"
STAMP=$(date +%Y-%m-%d)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

sqlite3 "$DATA/site.db" ".backup '$TMP/site.db'"
# Битую копию не сохраняем: пусть лучше упадёт и останется вчерашняя.
[ "$(sqlite3 "$TMP/site.db" 'PRAGMA integrity_check;')" = "ok" ] || { echo "копия базы не прошла проверку" >&2; exit 1; }

mkdir -p "$TMP/uploads"
[ -d "$DATA/uploads" ] && cp -a "$DATA/uploads/." "$TMP/uploads/"

# Через .part: если упадёт посередине, не останется «целого» на вид, но обрезанного архива.
tar -czf "$OUT/ulybaysya-$STAMP.tar.gz.part" -C "$TMP" site.db uploads
mv "$OUT/ulybaysya-$STAMP.tar.gz.part" "$OUT/ulybaysya-$STAMP.tar.gz"

ls -1t "$OUT"/ulybaysya-*.tar.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
ARCHIVE="$OUT/ulybaysya-$STAMP.tar.gz"
echo "$(date '+%F %T') копия: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# Вторая копия — в Яндекс Облако (Object Storage). Ключи кладёт владелец в /etc/ulybaysya-backup.env:
#   S3_KEY_ID=…  S3_SECRET=…  S3_BUCKET=…
# У сервисного аккаунта только роль storage.uploader: залить может, удалить или прочитать старые копии — нет.
CREDS="${BACKUP_CREDS:-/etc/ulybaysya-backup.env}"
if [ ! -r "$CREDS" ]; then
  echo "облако не настроено ($CREDS нет) — копия только на сервере"
  exit 0
fi
# shellcheck disable=SC1090
. "$CREDS"
# Ключ передаём curl через stdin (-K -), а не в аргументах: так его не видно в списке процессов.
printf 'user = "%s:%s"\n' "$S3_KEY_ID" "$S3_SECRET" | curl -sS --fail --max-time 300 -K - \
  --aws-sigv4 "aws:amz:ru-central1:s3" -H "x-amz-content-sha256: UNSIGNED-PAYLOAD" \
  -T "$ARCHIVE" "https://storage.yandexcloud.net/$S3_BUCKET/ulybaysya-$STAMP.tar.gz" -o /dev/null
echo "$(date '+%F %T') в облаке: $S3_BUCKET/ulybaysya-$STAMP.tar.gz"
