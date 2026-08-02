#!/usr/bin/env bash

set -euo pipefail

# Resolve the directory this script lives in, even when launched from Nemo.
TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$TOOLS_DIR/.." && pwd)"

cd "$PROJECT_DIR"

python "$TOOLS_DIR/build_context.py"

echo
echo "Build context snapshot created."
echo "Output:"
echo "$TOOLS_DIR/snapshots/codebase-context.txt"

# Keep the terminal open when launched by double-clicking from a file browser.
echo
read -rp "Press Enter to close..."
