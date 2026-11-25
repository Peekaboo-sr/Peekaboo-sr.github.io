#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p .assets/site
cp ../site/analytics.js ../site/catalog.js ../site/style.css .assets/site/
