@echo off
title BanglaBook Launcher (Fast LAN Mode)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1" -NoTunnel %*
if errorlevel 1 (
    echo.
    echo An error occurred while starting services.
    pause
)
