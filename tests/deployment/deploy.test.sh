#!/usr/bin/env bash
# Run in Linux with Bash and Python 3; no Docker daemon, systemd or real database required.
set -Eeuo pipefail
SOURCE=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf -- "$WORK"' EXIT
mkdir -p "$WORK/bin" "$WORK/home" /var/run
python3 - <<'PY'
import os, socket
path = '/var/run/docker.sock'
if not os.path.exists(path):
    sock = socket.socket(socket.AF_UNIX)
    sock.bind(path)
    sock.close()
PY
cat >"$WORK/bin/mock" <<'MOCK'
#!/usr/bin/env bash
set -eu
name=${0##*/}
printf '%s %s\n' "$name" "$*" >>"$TRACE"
case "$name" in
    node)
        if [[ ${1:-} == -p ]]; then echo 22;
        else [[ "$PWD" == */.data/deploy && -z ${SPLENDOR_TTS_ASSET_DIR:-} ]] || exit 7; fi ;;
    pnpm)
        if [[ ${1:-} == --version ]]; then echo 11.15.1; fi
        if [[ ${1:-} == install ]]; then
            [[ "$*" == *--prod=false* && "$NODE_ENV" == production ]] || exit 7
        fi
        if [[ "$*" == *scripts/migrate.ts* && ${FAIL_MIGRATION:-0} == 1 ]]; then exit 8; fi ;;
    openssl)
        if [[ "$*" == *-base64* ]]; then echo AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=;
        else printf '%064d\n' 1; fi ;;
    loginctl) echo yes ;;
    systemctl)
        if [[ "$*" == *is-active* ]]; then echo active; fi ;;
    git) echo 0123456789012345678901234567890123456789 ;;
    docker)
        if [[ "$*" == 'context show' ]]; then echo default; fi
        if [[ "$*" == *to_regclass* ]]; then echo "${INITIALIZED:-f}"; fi
        if [[ "$*" == *pg_dump* ]]; then echo fixture-database-backup; fi
        if [[ "$*" == *'ps --status running --services web'* ]]; then echo web; fi ;;
    curl)
        if [[ "$*" == *https://* && ${FAIL_HTTPS:-0} == 1 ]]; then exit 60; fi ;;
esac
MOCK
chmod +x "$WORK/bin/mock"
for command in docker node pnpm curl openssl systemctl loginctl git; do ln -s mock "$WORK/bin/$command"; done
export PATH="$WORK/bin:$PATH" HOME="$WORK/home" TRACE="$WORK/trace"
unset DOCKER_HOST
new_site() {
    SITE="$WORK/$1"
    mkdir -p "$SITE/scripts/media"
    cp "$SOURCE/deploy.sh" "$SITE/deploy.sh"
    printf 'NODE_ENV=development\n' >"$SITE/.env"
    : >"$TRACE"
}
assert_no() { if grep -Fq -- "$1" "$2"; then echo "Unexpected: $1" >&2; exit 1; fi; }
new_site first
export SPLENDOR_TTS_ASSET_DIR=/development/private-tts-art
printf 'games.example.com\n' | bash "$SITE/deploy.sh" >"$WORK/output"
grep -Fq '部署成功：https://games.example.com' "$WORK/output"
grep -Fq 'NODE_ENV=development' "$SITE/.env"
[[ $(stat -c '%a' "$SITE/.data/deploy/production.env") == 600 ]]
grep -Fq 'COOKIE_SECURE=true' "$SITE/.data/deploy/production.env"
assert_no 'pg_dump' "$TRACE"
assert_no 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' "$WORK/output"
cp "$SITE/.data/deploy/production.env" "$WORK/original.env"
printf 'asset-byte' >"$SITE/.data/deploy/assets/fixture.png"
export INITIALIZED=t
: >"$TRACE"
bash "$SITE/deploy.sh" >"$WORK/output"
cmp "$WORK/original.env" "$SITE/.data/deploy/production.env"
BACKUP=$(find "$SITE/.data/deploy/backups" -name COMPLETE -print -quit)
[[ -n "$BACKUP" ]]
cmp "$WORK/original.env" "${BACKUP%/COMPLETE}/production.env"
tar -xOf "${BACKUP%/COMPLETE}/assets.tar.gz" ./fixture.png | grep -Fq asset-byte
grep -Fq fixture-database-backup "${BACKUP%/COMPLETE}/database.dump"
python3 - "$TRACE" <<'PY'
import sys
text = open(sys.argv[1]).read()
assert text.index('stop boardgame-production.service') < text.index('pg_dump')
assert text.index('pg_dump') < text.index('scripts/migrate.ts')
assert text.index('scripts/seed-assets.ts') < text.index('enable --now')
PY
echo 'PASS: first install, production settings, retained secrets, ordered update and complete backup'

: >"$TRACE"
export FAIL_MIGRATION=1
if bash "$SITE/deploy.sh" >"$WORK/output" 2>&1; then echo 'Migration failure ignored' >&2; exit 1; fi
assert_no 'enable --now' "$TRACE"
assert_no '部署成功' "$WORK/output"
unset FAIL_MIGRATION
echo 'PASS: failed migration does not start services or report success'

: >"$TRACE"
export FAIL_HTTPS=1
if bash "$SITE/deploy.sh" >"$WORK/output" 2>&1; then echo 'Invalid HTTPS ignored' >&2; exit 1; fi
assert_no '部署成功' "$WORK/output"
unset FAIL_HTTPS
echo 'PASS: failed public HTTPS check never reports successful deployment'

: >"$TRACE"
bash "$SITE/deploy.sh" backup >"$WORK/output"
grep -Fq 'start boardgame-production.service' "$TRACE"
grep -Fq 'start web' "$TRACE"
echo 'PASS: explicit backup restores previously running services'

new_site invalid
if printf 'example.com;touch /tmp/injected\n' | bash "$SITE/deploy.sh" >"$WORK/output" 2>&1; then exit 1; fi
[[ ! -f "$SITE/.data/deploy/production.env" ]]
assert_no 'compose --env-file' "$TRACE"
echo 'PASS: invalid domain is rejected before mutation of deployment services'

new_site locked
mkdir -p "$SITE/.data/deploy"
exec 8>"$SITE/.data/deploy/operation.lock"
flock 8
if bash "$SITE/deploy.sh" >"$WORK/output" 2>&1; then exit 1; fi
grep -Fq '已有部署/维护操作正在运行' "$WORK/output"
assert_no 'compose --env-file' "$TRACE"
echo 'PASS: concurrent maintenance is refused'
