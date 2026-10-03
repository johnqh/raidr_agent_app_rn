#!/bin/bash
set -euo pipefail

echo "=== Xcode Cloud: iOS post-clone setup ==="

cd "$CI_PRIMARY_REPOSITORY_PATH"

# --- Install tooling ---
echo "Installing Node.js..."
brew install node

echo "Installing Bun..."
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# --- Configure npm registry for private @sudobility packages ---
echo "Configuring npm registry..."
cat > "$HOME/.npmrc" << NPMEOF
@sudobility:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${NPM_TOKEN:-}
NPMEOF

# --- Install JS dependencies ---
echo "Installing JS dependencies..."
bun install --frozen-lockfile

# --- Write environment variables ---
# Every variable .env.example declares, valued from the workflow's Environment
# Variables (Xcode Cloud > Workflow > Environment; mark sensitive ones Secret).
# The names are read from .env.example rather than listed here, so this file
# cannot fall behind what the app reads. A name the workflow does not set is
# written blank, which the app reads as "not configured".
: > .env
for name in $(sed -n 's/^\([A-Z][A-Z0-9_]*\)=.*/\1/p' .env.example); do
  printf '%s=%s\n' "$name" "$(printenv "$name" || true)" >> .env
done
echo "Wrote .env with $(wc -l < .env | tr -d ' ') variables."

# --- Install CocoaPods ---
echo "Installing CocoaPods dependencies..."
cd ios
pod install

echo "=== iOS post-clone setup complete ==="
