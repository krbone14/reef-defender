#!/usr/bin/env bash
# Idempotent setup for the Reef Defender run/screenshot driver.
# Safe to re-run — every step checks whether it already did its job.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -d node_modules/playwright ]; then
  npm install
fi

if [ ! -d "$HOME/.cache/ms-playwright/chromium-1228" ]; then
  npx playwright install chromium
fi

# This container has no passwordless sudo, so `playwright install
# --with-deps` cannot run apt-get as root. Chromium still needs
# libnspr4/libnss3/libasound2 at runtime. Fetch just those .debs
# (apt-get download does NOT require root) and extract the .so files
# locally instead of installing them system-wide.
LIBDIR="system-libs/usr/lib/x86_64-linux-gnu"
if [ ! -f "$LIBDIR/libnspr4.so" ]; then
  rm -rf .debtmp && mkdir .debtmp
  (cd .debtmp && apt-get download libnspr4 libnss3 libasound2t64 libasound2-data)
  mkdir -p system-libs
  for f in .debtmp/*.deb; do dpkg-deb -x "$f" system-libs; done
  rm -rf .debtmp
fi

echo "setup OK. Missing libs (if any) live under $LIBDIR"
