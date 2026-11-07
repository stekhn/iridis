#!/bin/sh
# Rasterises the SVG marks in public/ into the PNG icons the web manifest and iOS need.
# Requires rsvg-convert (librsvg). Run: npm run icons
set -e
cd "$(dirname "$0")/.."
rsvg-convert -w 192 -h 192 public/favicon.svg -o public/pwa-192x192.png
rsvg-convert -w 512 -h 512 public/favicon.svg -o public/pwa-512x512.png
rsvg-convert -w 512 -h 512 public/icon-maskable.svg -o public/pwa-maskable-512x512.png
rsvg-convert -w 180 -h 180 public/icon-maskable.svg -o public/apple-touch-icon-180x180.png
echo "icons written to public/"
