#!/usr/bin/env bash
set -euo pipefail

mkdir -p vendor/three

VERS="0.159.0"
BASE_UNPKG="https://unpkg.com/three@${VERS}"

echo "Downloading three.js ${VERS} vendor files…"
curl -L "${BASE_UNPKG}/build/three.module.js" -o vendor/three/three.module.js
curl -L "${BASE_UNPKG}/examples/jsm/controls/OrbitControls.js" -o vendor/three/OrbitControls.js
curl -L "${BASE_UNPKG}/examples/jsm/loaders/GLTFLoader.js" -o vendor/three/GLTFLoader.js

echo "Done."
