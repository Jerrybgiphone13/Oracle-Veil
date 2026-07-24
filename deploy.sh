#!/usr/bin/env bash
# Incremental deploy for The Heart Cut -> Namecheap cPanel (LiteSpeed).
# Only changed files are uploaded. Also bumps the cache version so browsers
# and the service worker fetch fresh files instead of stale cached ones.
set -euo pipefail

# ---- Host details from cPanel -> "SSH Access" ----
SSH_HOST="162.213.255.21"                   # server143-2.web-hosting.com (IP is unambiguous)
SSH_PORT="21098"                            # Namecheap shared-hosting SSH port
REMOTE_DIR="public_html"                    # deploy target on the server

cd "$(dirname "$0")"

# Refuse to upload an incomplete or wrongly proportioned deck.
python3 scripts/check_card_assets.py

# Keep the cPanel username out of the repository. One-time setup:
#   echo 'SSH_USER="your-cpanel-username"' > deploy.local
[ -f deploy.local ] && . ./deploy.local
SSH_USER="${SSH_USER:-CPANEL_USERNAME}"
if [ "$SSH_USER" = "CPANEL_USERNAME" ]; then
  echo "Set your cPanel username first:  echo 'SSH_USER=\"yourname\"' > deploy.local" >&2
  exit 1
fi

# ---- 1. Bump the app shell and card-art URL versions together ----
CUR=$(grep -oE 'heart-cut-v[0-9]+' sw.js | head -1 | grep -oE '[0-9]+$')
NEXT=$((CUR + 1))
echo "Cache version v$CUR -> v$NEXT"
# Portable in-place edit (works with both BSD sed on macOS and GNU sed).
for f in index.html sw.js app.js; do
  sed "s/v=$CUR/v=$NEXT/g; s/heart-cut-v$CUR/heart-cut-v$NEXT/g; s/CARD_ART_VERSION = \"$CUR\"/CARD_ART_VERSION = \"$NEXT\"/g" "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
python3 scripts/check_card_assets.py

# ---- 2. Upload only what changed ----
rsync -avz \
  --exclude '.git' --exclude '.gitignore' --exclude '.DS_Store' --exclude '**/.DS_Store' \
  --exclude 'server.mjs' --exclude '.env*' --exclude 'deploy.local' --exclude 'package.json' \
  --exclude 'README.md' --exclude 'deploy.sh' --exclude 'deploy-node.sh' \
  --exclude '.htaccess' \
  --exclude '_preview_sidedeck.html' --exclude 'dev-*.html' --exclude 'cards.pages' \
  --exclude 'key.txt' --exclude '*.zip' --exclude 'serve.py' --exclude 'scripts' \
  -e "ssh -p $SSH_PORT" \
  ./ "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

echo "Deployed v$NEXT. Open https://oracleveil.online and hard-refresh (Cmd+Shift+R)."
