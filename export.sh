#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

verbose=0
xml_path=""
for arg in "$@"; do
  if [[ "$arg" == "-v" ]]; then
    verbose=1
  else
    xml_path="$arg"
  fi
done

if [[ -z "$xml_path" ]]; then
  echo "Usage: export.sh [-v] /path/to/xml" >&2
  exit 1
fi
if [[ ! -f "$xml_path" ]]; then
  echo "File not found: $xml_path" >&2
  exit 1
fi

xml_abs="$(cd "$(dirname "$xml_path")" && pwd)/$(basename "$xml_path")"
cli_args=(src/cli.js "$xml_abs")
if [[ "$verbose" -eq 1 ]]; then
  cli_args+=(-v)
fi

have_docker=0
if command -v docker >/dev/null 2>&1; then
  have_docker=1
fi

if [[ "$have_docker" -eq 1 ]]; then
  docker compose up -d redis
  ready=0
  for _ in $(seq 1 30); do
    if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" -ne 1 ]]; then
    echo "Redis did not become ready" >&2
    exit 1
  fi
  cli_docker=(node src/cli.js /data/input.xml)
  if [[ "$verbose" -eq 1 ]]; then
    cli_docker+=(-v)
  fi
  docker compose run --rm \
    -v "$xml_abs":/data/input.xml:ro \
    exporter \
    "${cli_docker[@]}"
  exit $?
fi

if command -v redis-server >/dev/null 2>&1; then
  if ! (echo ping | redis-cli) 2>/dev/null | grep -q PONG; then
    redis-server --daemonize yes
  fi
fi

export REDIS_HOST="${REDIS_HOST:-localhost}"
exec node "${cli_args[@]}"
