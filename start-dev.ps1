param (
    [switch]$NoMobile,
    [switch]$BackendOnly,
    [switch]$NoTunnel
)

$RootDir = $PSScriptRoot

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  BanglaBook Full-Stack Launcher" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Root: $RootDir" -ForegroundColor Gray

# 1. Start FastAPI Backend
Write-Host "[1/5] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
$apiCmd = "Set-Location '$RootDir\platform-api'; if (Test-Path '.\.venv\Scripts\Activate.ps1') { .\.venv\Scripts\Activate.ps1 }; `$host.UI.RawUI.WindowTitle = 'BanglaBook API'; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCmd

Start-Sleep -Seconds 2

# 2. Start Gemini OCR & TTS Service (port 8001)
Write-Host "[2/5] Starting Gemini OCR & TTS Service on http://localhost:8001..." -ForegroundColor Green
$ttsCmd = "Set-Location '$RootDir\tts-service'; if (Test-Path '.\.venv\Scripts\Activate.ps1') { .\.venv\Scripts\Activate.ps1 }; `$host.UI.RawUI.WindowTitle = 'BanglaBook TTS & OCR'; uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $ttsCmd

Start-Sleep -Seconds 2

# 3. Start Background Generation Worker
Write-Host "[3/5] Starting Background Generation Worker..." -ForegroundColor Green
$workerCmd = "Set-Location '$RootDir\platform-api'; if (Test-Path '.\.venv\Scripts\Activate.ps1') { .\.venv\Scripts\Activate.ps1 }; `$host.UI.RawUI.WindowTitle = 'BanglaBook Worker'; python -m app.worker"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $workerCmd

if (-not $BackendOnly) {
    Start-Sleep -Seconds 1

    # 4. Start Admin Web App
    Write-Host "[4/5] Starting Admin Web Portal on http://localhost:5173..." -ForegroundColor Green
    $adminCmd = "Set-Location '$RootDir\admin'; `$host.UI.RawUI.WindowTitle = 'BanglaBook Admin'; npm.cmd run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $adminCmd

    if (-not $NoMobile) {
        Start-Sleep -Seconds 1

        # 5. Start Expo Mobile App
        Write-Host "[5/5] Starting React Native Expo App..." -ForegroundColor Green
        $wifiIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*' -ErrorAction SilentlyContinue).IPAddress
        if (-not $wifiIp) {
            $wifiIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^(169\.254|127\.)' } | Select-Object -First 1).IPAddress
        }
        if ($wifiIp) {
            Write-Host "Bound Expo packager to LAN IP: $wifiIp" -ForegroundColor Cyan
        }
        $tunnelArg = if ($NoTunnel) { "" } else { "--tunnel" }
        $mobileCmd = "Set-Location '$RootDir\app'; if ('$wifiIp') { `$env:REACT_NATIVE_PACKAGER_HOSTNAME = '$wifiIp' }; `$host.UI.RawUI.WindowTitle = 'BanglaBook Mobile'; Write-Host 'Running Expo Mobile App with Tunnel...' -ForegroundColor Green; npx.cmd expo start -c $tunnelArg"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $mobileCmd
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  All selected services launched!" -ForegroundColor Green
Write-Host "  - Admin Portal : http://localhost:5173" -ForegroundColor Yellow
Write-Host "  - Backend API  : http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "  - TTS/OCR API  : http://localhost:8001/docs" -ForegroundColor Yellow
Write-Host "  To stop all services and free ports, run: .\stop-dev.ps1" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

