#!/bin/bash

echo "📦 Packaging extension for Chrome Web Store..."

# Check if there are uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "⚠️  WARNING: You have uncommitted changes!"
    echo "   'git archive' only packages committed files."
    echo "   Please commit your changes before running this script."
    read -p "   Press [Enter] to continue anyway (stale files will be packed) or Ctrl+C to cancel..."
fi

# 1. Create a clean zip from git (respects .gitattributes)
echo "   Creating archive from git..."
git archive -o dist.zip HEAD

# 2. Add the untracked config.js
if [ -f "config.js" ]; then
    if command -v zip >/dev/null 2>&1; then
        echo "   Adding config.js..."
        zip dist.zip config.js
    else
        echo "❌ Error: 'zip' command not found."
        echo "   Could not add config.js to the archive."
        echo "   Please install 'zip' or add the file manually."
        exit 1
    fi
else
    echo "❌ Error: config.js not found!"
    exit 1
fi

echo "✅ Build complete: dist.zip"
