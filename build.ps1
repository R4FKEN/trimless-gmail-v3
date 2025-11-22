# Set output encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "[BUILD] Packaging extension for Chrome Web Store..." -ForegroundColor Cyan

# Check for uncommitted changes
if (git status -s) {
    Write-Host "[WARNING] You have uncommitted changes!" -ForegroundColor Yellow
    Write-Host "   'git archive' only packages committed files."
    Write-Host "   Please commit your changes before running this script."
    Write-Host "   Continuing in 5 seconds..."
    Start-Sleep -Seconds 5
}

# 1. Create a clean zip from git
Write-Host "   Creating archive from git..."
git archive -o dist.zip HEAD

# 2. Add config.js
if (Test-Path "config.js") {
    Write-Host "   Adding config.js..."
    Compress-Archive -Path config.js -Update -DestinationPath dist.zip
}
else {
    Write-Host "[ERROR] config.js not found!" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Build complete: dist.zip" -ForegroundColor Green
