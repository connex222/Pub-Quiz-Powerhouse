#!/bin/sh
# macOS/Linux: first-time launch installs dependencies
cd "$(dirname "$0")" || exit 1
if [ ! -d node_modules/express ]; then npm install || exit 1; fi
node server.js
