<#
.SYNOPSIS
  Stops all running BanglaBook development servers and frees occupied ports.
#>

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  🛑 Stopping all BanglaBook services..." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

# Ports to clear: 8000 (API), 8001 (TTS/OCR), 5173 (Admin Vite), 8081 (Expo Metro)
$Ports = @(8000, 8001, 5173, 8081)

foreach ($port in $Ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pidToKill = $conn.OwningProcess
            if ($pidToKill -and $pidToKill -ne 0) {
                Write-Host "Freeing port $port (stopping process PID $pidToKill)..." -ForegroundColor Cyan
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Stop any worker processes matching "app.worker"
$workers = Get-WmiObject Win32_Process -Filter "Name LIKE '%python%' AND CommandLine LIKE '%app.worker%'" -ErrorAction SilentlyContinue
if ($workers) {
    foreach ($w in $workers) {
        Write-Host "Stopping worker process PID $($w.ProcessId)..." -ForegroundColor Cyan
        Stop-Process -Id $w.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n✅ All BanglaBook services have been stopped and ports freed.`n" -ForegroundColor Green
