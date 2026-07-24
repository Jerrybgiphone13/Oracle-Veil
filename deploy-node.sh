#!/usr/bin/env bash
# Deploy The Heart Cut as a Node app (cPanel "Setup Node.js App" / Passenger) on
# Namecheap shared hosting. Unlike deploy.sh (static -> public_html), this uploads
# the FULL project — including server.mjs and package.json — to the Node app root,
# so server.mjs serves both the static files and the /api/interpretation endpoint.
#
# One-time cPanel setup (do this first, in the browser):
#   Setup Node.js App -> Create Application
#     Node version:            18 or higher
#     Application mode:        Production
#     Application root:        heartcut-app        (must match APP_ROOT below)
#     Application URL:         oracleveil.online
#     Application startup file: server.mjs
#   Then add an environment variable  GEMINI_API_KEY = <your key>
#   (optional GEMINI_MODEL), and click Restart.
#
# The GEMINI key is NEVER uploaded — it lives only in the cPanel env vars.
set -euo pipefail

# ---- Fill these in from cPanel -> "SSH Access" ----
SSH_HOST="162.213.255.21"                    # server143-2.web-hosting.com
SSH_PORT="21098"                             # Namecheap shared-hosting SSH port
APP_ROOT="heartcut-app"                       # <-- must match the app's "Application root"

cd "$(dirname "$0")"

# Refuse to upload an incomplete or wrongly proportioned deck.
python3 scripts/check_card_assets.py

# Your cPanel username lives in an untracked file (deploy.local) so `git pull`
# never clobbers it and it never lands in the public repo. One-time setup:
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

# ---- 2. Upload the app (keep server.mjs + package.json; never the key or git cruft) ----
rsync -avz \
  --exclude '.git' --exclude '.gitignore' --exclude '.DS_Store' --exclude '**/.DS_Store' \
  --exclude '.env*' --exclude 'deploy.local' --exclude 'node_modules' \
  --exclude 'README.md' --exclude 'deploy.sh' --exclude 'deploy-node.sh' \
  --exclude '.htaccess' --exclude '_preview_sidedeck.html' --exclude 'dev-*.html' \
  --exclude 'cards.pages' --exclude 'key.txt' --exclude '*.zip' --exclude 'serve.py' --exclude 'scripts' \
  -e "ssh -p $SSH_PORT" \
  ./ "$SSH_USER@$SSH_HOST:$APP_ROOT/"

# ---- 3. Ask Passenger to reload the app so the new code takes effect ----
ssh -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "mkdir -p '$APP_ROOT/tmp' && touch '$APP_ROOT/tmp/restart.txt'"

echo "Deployed v$NEXT to $APP_ROOT and restarted the Node app."
echo "Verify:  curl -s -X POST https://oracleveil.online/api/interpretation -H 'Content-Type: application/json' -d '{}'"
echo "  (expect a 'question + four cards required' error, NOT 'GEMINI_API_KEY is not set')"
