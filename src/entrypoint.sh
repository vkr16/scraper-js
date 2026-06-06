#!/bin/sh

if [ ! -d "/app/src/node_modules" ]; then
  echo "node_modules not found, running npm install..."
  cd /app/src && npm install
else
  echo "node_modules found, skipping npm install..."
fi

xvfb-run --server-args="-screen 0 1920x1080x24" node /app/src/index.js