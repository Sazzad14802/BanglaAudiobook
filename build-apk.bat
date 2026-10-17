@echo off
title BornoVerse - Build Android APK
echo ====================================================
echo   BornoVerse: Building Standalone Android APK (EAS)
echo ====================================================
echo.
echo Project: @aristonix/bornoverse
echo Target : Android APK (Direct installable file)
echo Profile: preview
echo.
cd /d "%~dp0app"
npx -y eas-cli build -p android --profile preview %*
pause
