#!/usr/bin/env bash
# Incremental deploy for The Heart Cut -> Namecheap cPanel (LiteSpeed).
# Only changed files are uploaded. Also bumps the cache version so browsers
# and the service worker fetch fresh files instead of stale cached ones.
set -euo pipefail

# ---- Fill these in from cPanel -> "SSH Access" (shows host, port, username) ----
SSH_USER="CPANEL_USERNAME"                  # <-- your cPanel username (see cPanel "General Information")
SSH_HOST="162.213.255.21"                   # server143-2.web-hosting.com (IP is unambiguous)
SSH_PORT="21098"                            # Namecheap shared-hosting SSH port
REMOTE_DIR="public_html"                    # deploy target on the server

cd "$(dirname "$0")"

# ---- 1. Bump cache version (v=NN in index.html + sw.js, and the sw cache name) ----
CUR=$(grep -oE 'heart-cut-v[0-9]+' sw.js | head -1 | grep -oE '[0-9]+$')
NEXT=$((CUR + 1))
echo "Cache version v$CUR -> v$NEXT"
sed -i '' "s/v=$CUR/v=$NEXT/g; s/heart-cut-v$CUR/heart-cut-v$NEXT/g" index.html sw.js

# ---- 2. Upload only what changed ----
rsync -avz \
  --exclude '.git' --exclude '.gitignore' --exclude '.DS_Store' --exclude '**/.DS_Store' \
  --exclude 'server.mjs' --exclude '.env*' --exclude 'package.json' \
  --exclude 'README.md' --exclude 'deploy.sh' \
  -e "ssh -p $SSH_PORT" \
  ./ "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

echo "Deployed v$NEXT. Open https://oracleveil.online and hard-refresh (Cmd+Shift+R)."
