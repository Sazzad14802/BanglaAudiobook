@echo off
title BanglaBook - Build Android APK
echo ====================================================
echo   BanglaBook: Building Standalone Android APK (EAS)
echo ====================================================
echo.
echo Project: @aristonix/banglabook
echo Target : Android APK (Direct installable file)
echo Profile: preview
echo.
cd /d "%~dp0app"
npx -y eas-cli build -p android --profile preview %*
pause
