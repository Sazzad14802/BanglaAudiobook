@echo off
title BanglaBook Launcher
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1" %*
if errorlevel 1 (
    echo.
    echo An error occurred while starting services.
    pause
)
