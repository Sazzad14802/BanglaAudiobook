@echo off
title BornoVerse Cleanup
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-dev.ps1"
