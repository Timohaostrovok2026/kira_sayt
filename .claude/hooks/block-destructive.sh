#!/bin/bash
# PreToolUse-хук: блокирует необратимые команды и чтение секретов (AGENTS.md §3, §5).
# Получает JSON вызова на stdin; код 2 блокирует вызов, stderr видит Claude.
input=$(cat)
if command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
else
  cmd=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)
fi
[ -z "$cmd" ] && exit 0

block() {
  echo "Заблокировано правилом проекта: $1. Старое — в docs/_archive/, временное — в scratch/. Если правда нужно — спроси владельца, он сделает сам." >&2
  exit 2
}

# Временное удалять можно: scratch/, папка сессии Claude, кэш сборки .next.
safe_rm='^ *rm +(-[a-zA-Z]+ +)*((\./)?(web/)?(scratch/[^ ;&|]*|\.next/?)|/private/tmp/claude-[^ ;&|]+|/tmp/claude-[^ ;&|]+)( *$)'
if printf '%s' "$cmd" | grep -Eq "$safe_rm"; then exit 0; fi

# Текст в кавычках (сообщения коммитов, шаблоны grep) не считается командой —
# кроме команд на сервер: у ssh вся опасная часть как раз в кавычках.
if printf '%s' "$cmd" | grep -Eq '(^|[;&|( ])(ssh|scp|rsync)( |$)'; then
  bare=$cmd
else
  bare=$(printf '%s' "$cmd" | sed -E "s/\"[^\"]*\"//g; s/'[^']*'//g")
fi
# Шаблон .env.example читать можно.
bare_env=$(printf '%s' "$bare" | sed -E 's/\.env\.example//g')

pattern='(^|[;&|( "'"'"'])rm +(-[a-zA-Z]*[rRf]|--recursive|--force)'
pattern+='|git +reset +--hard|git +clean +-[a-zA-Z]*f|git +branch +-D|git +checkout +(-- +)?\.( |$)'
pattern+='|find +.*-delete|mkfs|dd +if='
if printf '%s' "$bare" | grep -Eiq "$pattern"; then block "необратимая команда"; fi

# Код живёт в закрытом репозитории на GitHub: обычный push можно, перезапись истории и новые репозитории — нет (AGENTS.md §5).
if printf '%s' "$bare" | grep -Eiq 'git +push +.*(--force|--mirror|--delete|-f( |$)|[ ]\+[^ ]+|[ ]:[^ ]+)|gh +repo +(create|delete|edit)'; then
  block "перезапись истории или изменение репозиториев на GitHub"; fi

# Секреты: .env*, /etc/ulybaysya.env, ключи SSH.
if printf '%s' "$bare_env" | grep -Eiq '(cat|less|head|tail|more|bat|grep|sed|awk|cp|scp) +[^;&|]*(\.env|ulybaysya\.env|\.ssh/)'; then
  block "чтение секретов"; fi

# Боевая база: не перезаписывать локальной, не трогать служебными скриптами (AGENTS.md §3).
if printf '%s' "$cmd" | grep -Eiq '(scp|rsync)[^;&|]*:/var/lib/ulybaysya' ||
   printf '%s' "$cmd" | grep -Eiq '(ssh|scp)[^;&|]*seed-stats'; then
  block "запись в боевую базу на сервере"; fi

# SQL проверяем целиком (запрос обычно в кавычках), но только при вызове клиента базы.
if printf '%s' "$cmd" | grep -Eiq '(sqlite3|psql|mysql)' &&
   printf '%s' "$cmd" | grep -Eiq '(DROP|TRUNCATE) +(TABLE|DATABASE|SCHEMA)|DELETE +FROM +[a-z_]+ *(;|"|'"'"'|$)'; then
  block "удаление таблицы или всех строк"; fi

exit 0
