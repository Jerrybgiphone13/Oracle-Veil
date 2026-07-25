#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_dir="$project_dir/dist"

rm -rf "$build_dir"
mkdir -p "$build_dir/client" "$build_dir/server"

cp \
  "$project_dir/index.html" \
  "$project_dir/app.js" \
  "$project_dir/styles.css" \
  "$project_dir/manifest.webmanifest" \
  "$project_dir/sw.js" \
  "$project_dir/icon.svg" \
  "$project_dir/icon-192.png" \
  "$project_dir/icon-512.png" \
  "$project_dir/icon-maskable-512.png" \
  "$project_dir/apple-touch-icon.png" \
  "$build_dir/client/"
cp -R "$project_dir/assets" "$build_dir/client/assets"
cp "$project_dir/worker/sites.js" "$build_dir/server/index.js"

printf 'Sites build ready: %s\n' "$build_dir"
