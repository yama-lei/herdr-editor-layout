#!/bin/sh
# Copies this repo's mods and layouts into Herdr's home. Herdr doesn't follow
# symlinked mod folders for hot reload, so files are copied (run again after edits).
set -eu
HOME_DIR="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
REPO="$(cd "$(dirname "$0")" && pwd)"
for d in "$REPO"/mods/*/; do
  name=$(basename "$d"); dest="$HOME_DIR/mods/$name"
  [ -L "$dest" ] && rm "$dest"
  mkdir -p "$dest"
  # Keep the machine-local hosts.json of open-vscode; skip files Herdr writes.
  rsync -a --exclude gpui-kit.d.ts --exclude jsconfig.json --exclude hosts.json --exclude .cache "$d" "$dest/"
  herdr-app check "$dest"
done
for f in "$REPO"/layouts/*; do
  dest="$HOME_DIR/layouts/$(basename "$f")"
  [ -L "$dest" ] && rm "$dest"
  cp "$f" "$dest"
done
echo "Installed. Merge keys.json into $HOME_DIR/keys.json once (see README), then:"
echo "  herdr-app do layout.switch --name workbench"
