#!/bin/zsh
set -euo pipefail
TASK_ROOT="${0:A:h:h}"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$TASK_ROOT/Web"
npm run build
python3 "$TASK_ROOT/scripts/package-web.py"
cd "$TASK_ROOT"
xcodebuild -quiet -project Fila.xcodeproj -scheme Fila -configuration "${FILA_CONFIGURATION:-Release}" ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO -derivedDataPath .build CODE_SIGNING_ALLOWED=NO build
codesign --force --sign - --entitlements "$TASK_ROOT/Fila/Fila.entitlements" "$TASK_ROOT/build/Fila.app"
codesign --verify --strict "$TASK_ROOT/build/Fila.app"
