<#
.SYNOPSIS
    Local setup for BornoVerse after a fresh clone (safe to re-run after pulls).
.DESCRIPTION
    - Creates .env files from the examples, with generated secrets
    - Creates Python venvs (.venv) and installs requirements
    - Creates the PostgreSQL database and runs Alembic migrations
    - Runs npm install for admin/ and app/
    Steps that are already done are skipped (dependencies are reinstalled only
    when requirements.txt / package-lock.json change, or with -Force).
.EXAMPLE
    .\setup-dev.ps1
    .\setup-dev.ps1 -SkipTts      # skip the multi-GB tts-service install
    .\setup-dev.ps1 -NoPrompt     # never ask for input
#>
param (
    [switch]$SkipTts,
    [switch]$SkipNode,
    [switch]$NoPrompt,
    [switch]$Force
)

$ErrorActionPreference = 'Continue'
$RootDir = $PSScriptRoot
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$Warnings = New-Object System.Collections.Generic.List[string]
$Errors = New-Object System.Collections.Generic.List[string]

$ApiDir = Join-Path $RootDir 'platform-api'
$TtsDir = Join-Path $RootDir 'tts-service'
$AdminDir = Join-Path $RootDir 'admin'
$AppDir = Join-Path $RootDir 'app'
$ApiEnv = Join-Path $ApiDir '.env'
$TtsEnv = Join-Path $TtsDir '.env'
$AppEnv = Join-Path $AppDir '.env'

# ── Helpers ───────────────────────────────────────────────────────────────────

function Write-Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "    $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor Gray }
function Add-Warning($msg) { $script:Warnings.Add($msg); Write-Host "    WARNING: $msg" -ForegroundColor Yellow }
function Add-Error($msg) { $script:Errors.Add($msg); Write-Host "    ERROR: $msg" -ForegroundColor Red }

function New-Secret {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

function Get-EnvValue($file, $key) {
    foreach ($line in [IO.File]::ReadAllLines($file)) {
        if ($line -match "^\s*$key\s*=(.*)$") { return $Matches[1].Trim().Trim('"').Trim("'") }
    }
    return $null
}

function Set-EnvValue($file, $key, $value) {
    $lines = @([IO.File]::ReadAllLines($file))
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*$key\s*=") { $lines[$i] = "$key=$value"; $found = $true }
    }
    if (-not $found) { $lines += "$key=$value" }
    [IO.File]::WriteAllLines($file, [string[]]$lines, $Utf8NoBom)
}

function Copy-EnvExample($dir) {
    $envFile = Join-Path $dir '.env'
    if (Test-Path $envFile) { Write-Info "$(Split-Path $dir -Leaf)\.env already exists, keeping it"; return }
    Copy-Item (Join-Path $dir '.env.example') $envFile
    Write-Ok "Created $(Split-Path $dir -Leaf)\.env"
}

function Read-Answer($prompt) {
    if ($NoPrompt) { return '' }
    return (Read-Host "    $prompt").Trim()
}

# Dependency stamps: skip reinstalling when the lock/requirements file is unchanged.
function Test-Stamp($stampFile, $sourceFile) {
    if ($Force -or -not (Test-Path $stampFile)) { return $false }
    return ((Get-Content $stampFile -Raw).Trim() -eq (Get-FileHash $sourceFile -Algorithm SHA256).Hash)
}
function Save-Stamp($stampFile, $sourceFile) {
    (Get-FileHash $sourceFile -Algorithm SHA256).Hash | Set-Content $stampFile -Encoding ASCII
}

function Install-PythonService($dir, $name) {
    $venvPy = Join-Path $dir '.venv\Scripts\python.exe'
    if (-not (Test-Path $venvPy)) {
        Write-Info "Creating virtual environment..."
        & $script:PyExe @script:PyPre -m venv (Join-Path $dir '.venv') | Out-Host
        if (-not (Test-Path $venvPy)) { Add-Error "Could not create $name\.venv"; return $null }
    }
    $req = Join-Path $dir 'requirements.txt'
    $stamp = Join-Path $dir '.venv\.setup-stamp'
    if (Test-Stamp $stamp $req) { Write-Ok "$name dependencies are up to date"; return $venvPy }

    Write-Info "Installing $name dependencies..."
    & $venvPy -m pip install --upgrade pip --quiet --disable-pip-version-check | Out-Host
    & $venvPy -m pip install -r $req --disable-pip-version-check | Out-Host
    if ($LASTEXITCODE -ne 0) { Add-Error "pip install failed for $name (see output above)"; return $venvPy }
    Save-Stamp $stamp $req
    Write-Ok "$name dependencies installed"
    return $venvPy
}

function Install-NodeProject($dir, $name) {
    $lock = Join-Path $dir 'package-lock.json'
    if (-not (Test-Path $lock)) { $lock = Join-Path $dir 'package.json' }
    $stamp = Join-Path $dir 'node_modules\.setup-stamp'
    if (Test-Stamp $stamp $lock) { Write-Ok "$name dependencies are up to date"; return }

    Write-Info "Running npm install in $name..."
    Push-Location $dir
    & npm.cmd install
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { Add-Error "npm install failed for $name (see output above)"; return }
    Save-Stamp $stamp $lock
    Write-Ok "$name dependencies installed"
}

# ── Banner ────────────────────────────────────────────────────────────────────

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  BornoVerse Local Setup" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Root: $RootDir" -ForegroundColor Gray

# Ask up front about the large TTS install, unless it is already up to date.
$ttsUpToDate = Test-Stamp (Join-Path $TtsDir '.venv\.setup-stamp') (Join-Path $TtsDir 'requirements.txt')
if (-not $SkipTts -and -not $NoPrompt -and -not $ttsUpToDate) {
    Write-Host ""
    Write-Host "The tts-service install is large (several GB: PyTorch, Coqui TTS) and can take a long time." -ForegroundColor Yellow
    Write-Host "It is only needed to generate audiobooks from PDFs; you can install it later by re-running setup." -ForegroundColor Gray
    $answer = Read-Answer "Install tts-service now? [Y/n]"
    if ($answer -match '^[nN]') {
        $SkipTts = $true
        Add-Warning "tts-service was skipped. Re-run .\setup-dev.bat later to install it (needed for PDF -> audiobook)."
    }
}

# ── 1. Prerequisites ──────────────────────────────────────────────────────────

Write-Step "[1/7] Checking prerequisites"

# Prefer Python 3.11: tts-service's Coqui TTS package does not support 3.12+.
$PyExe = $null; $PyPre = @(); $PyVer = $null
foreach ($candidate in @('py -3.11', 'python', 'py -3')) {
    $parts = $candidate -split ' '
    if (-not (Get-Command $parts[0] -ErrorAction SilentlyContinue)) { continue }
    $pre = @($parts | Select-Object -Skip 1)
    $out = & $parts[0] @pre -c "import sys; print('%d.%d' % sys.version_info[:2])" 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $out) { continue }
    $ver = [version]"$out".Trim()
    if ($ver -ge [version]'3.11') { $PyExe = $parts[0]; $PyPre = $pre; $PyVer = $ver; break }
}
if ($PyExe) {
    Write-Ok "Python $PyVer ($PyExe $($PyPre -join ' '))"
    if ($PyVer -ge [version]'3.12' -and -not $SkipTts) {
        Add-Warning "Python $PyVer found; tts-service needs Python 3.11 (Coqui TTS). Install 3.11 if its install fails."
    }
} else {
    Add-Error "Python 3.11+ not found. Install Python 3.11 from https://www.python.org/downloads/ and re-run."
}

$HasNode = $false
if (-not $SkipNode) {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVer = [version]((& node -v).TrimStart('v'))
        if ($nodeVer -ge [version]'18.0') { Write-Ok "Node.js $nodeVer"; $HasNode = $true }
        else { Add-Error "Node.js $nodeVer is too old; install Node.js 18+ from https://nodejs.org/" }
    } else {
        Add-Error "Node.js not found. Install Node.js 18+ from https://nodejs.org/ and re-run."
    }
}

# start-dev.ps1 activates each venv with Activate.ps1, which a Restricted policy blocks.
$policy = 'Undefined'
foreach ($scope in @('MachinePolicy', 'UserPolicy', 'CurrentUser', 'LocalMachine')) {
    $p = [string](Get-ExecutionPolicy -Scope $scope)
    if ($p -ne 'Undefined') { $policy = $p; break }
}
if ($policy -eq 'Undefined') { $policy = 'Restricted' }
if ($policy -in @('Restricted', 'AllSigned')) {
    $answer = Read-Answer "PowerShell policy '$policy' blocks venv activation. Set CurrentUser policy to RemoteSigned? [Y/n]"
    if (-not $NoPrompt -and $answer -notmatch '^[nN]') {
        try {
            Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force -ErrorAction Stop
            Write-Ok "Execution policy set to RemoteSigned (CurrentUser)"
        } catch { Add-Warning "Could not change execution policy: $($_.Exception.Message)" }
    } else {
        Add-Warning "Run 'Set-ExecutionPolicy -Scope CurrentUser RemoteSigned' or start-dev cannot activate the venvs."
    }
} else {
    Write-Ok "PowerShell execution policy: $policy"
}

# ── 2. Environment files ──────────────────────────────────────────────────────

Write-Step "[2/7] Environment files"

Copy-EnvExample $ApiDir
Copy-EnvExample $TtsDir
Copy-EnvExample $AppDir

$jwt = Get-EnvValue $ApiEnv 'JWT_SECRET_KEY'
if (-not $jwt -or $jwt -like 'change-this*') {
    Set-EnvValue $ApiEnv 'JWT_SECRET_KEY' (New-Secret)
    Write-Ok "Generated JWT_SECRET_KEY"
}

# The API and TTS service must share the same key, or the worker gets 401s.
$serviceKey = Get-EnvValue $ApiEnv 'TTS_SERVICE_KEY'
if (-not $serviceKey -or $serviceKey -like 'change-me*') {
    $serviceKey = New-Secret
    Set-EnvValue $ApiEnv 'TTS_SERVICE_KEY' $serviceKey
    Write-Ok "Generated TTS_SERVICE_KEY"
}
if ((Get-EnvValue $TtsEnv 'TTS_SERVICE_KEY') -ne $serviceKey) {
    Set-EnvValue $TtsEnv 'TTS_SERVICE_KEY' $serviceKey
    Write-Ok "Synced TTS_SERVICE_KEY into tts-service\.env"
}

if (-not (Get-EnvValue $TtsEnv 'GEMINI_API_KEY')) {
    $gemini = Read-Answer "Gemini API key for OCR/TTS (https://aistudio.google.com/apikey, Enter to skip)"
    if ($gemini) { Set-EnvValue $TtsEnv 'GEMINI_API_KEY' $gemini; Write-Ok "Saved GEMINI_API_KEY" }
    else { Add-Warning "GEMINI_API_KEY is empty in tts-service\.env; PDF -> audiobook generation will not work." }
} else {
    Write-Ok "GEMINI_API_KEY is set"
}

# ── 3. Platform API dependencies ──────────────────────────────────────────────

Write-Step "[3/7] Platform API (platform-api)"
$ApiPy = $null
if ($PyExe) { $ApiPy = Install-PythonService $ApiDir 'platform-api' }

# ── 4. Database ───────────────────────────────────────────────────────────────

Write-Step "[4/7] PostgreSQL database"

$dbScript = Join-Path ([IO.Path]::GetTempPath()) 'bornoverse_create_db.py'
@'
import os, sys
import psycopg
from psycopg import sql
from sqlalchemy.engine import make_url

url = make_url(os.environ["SETUP_DB_URL"])
try:
    with psycopg.connect(host=url.host or "localhost", port=url.port or 5432,
                         user=url.username, password=url.password,
                         dbname="postgres", autocommit=True, connect_timeout=5) as conn:
        if conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (url.database,)).fetchone():
            print(f"Database '{url.database}' already exists")
        else:
            conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(url.database)))
            print(f"Created database '{url.database}'")
except psycopg.OperationalError as e:
    print(str(e).strip(), file=sys.stderr)
    sys.exit(2 if "password authentication failed" in str(e) else 1)
'@ | Set-Content $dbScript -Encoding ASCII

$DbReady = $false
if ($ApiPy -and (Test-Path $ApiPy)) {
    for ($attempt = 1; $attempt -le 2; $attempt++) {
        $env:SETUP_DB_URL = Get-EnvValue $ApiEnv 'SYNC_DATABASE_URL'
        $out = & $ApiPy $dbScript
        $code = $LASTEXITCODE
        if ($code -eq 0) { Write-Ok $out; $DbReady = $true; break }
        if ($code -eq 2 -and $attempt -eq 1 -and -not $NoPrompt) {
            Write-Host "    Postgres rejected the password in platform-api\.env." -ForegroundColor Yellow
            $secure = Read-Host "    Postgres password (Enter to skip)" -AsSecureString
            $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
            if (-not $plain) { break }
            $encoded = [Uri]::EscapeDataString($plain)
            foreach ($key in @('DATABASE_URL', 'SYNC_DATABASE_URL')) {
                $newUrl = (Get-EnvValue $ApiEnv $key) -replace '^([^:]+://[^:/@]+:)[^@]*(@)', ('${1}' + $encoded + '${2}')
                Set-EnvValue $ApiEnv $key $newUrl
            }
            continue
        }
        break
    }
    Remove-Item Env:SETUP_DB_URL -ErrorAction SilentlyContinue
    if (-not $DbReady) {
        Add-Error "Could not reach PostgreSQL. Install/start PostgreSQL 14+ and check DATABASE_URL and SYNC_DATABASE_URL in platform-api\.env, then re-run."
    }
} else {
    Add-Warning "Skipped database setup (platform-api venv is not available)."
}
Remove-Item $dbScript -ErrorAction SilentlyContinue

# ── 5. Migrations ─────────────────────────────────────────────────────────────

Write-Step "[5/7] Database migrations"
if ($DbReady) {
    Push-Location $ApiDir
    & $ApiPy -m alembic upgrade head
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -eq 0) { Write-Ok "Database schema is up to date" }
    else { Add-Error "alembic upgrade head failed (see output above)" }
} else {
    Add-Warning "Skipped migrations (database not ready)."
}

# ── 6. TTS service dependencies ───────────────────────────────────────────────

Write-Step "[6/7] TTS / OCR service (tts-service)"
if ($SkipTts) { Write-Info "Skipped (-SkipTts)" }
elseif ($PyExe) {
    Write-Info "This install is large (PyTorch, Coqui TTS); the first run can take a while."
    [void](Install-PythonService $TtsDir 'tts-service')
}

# ── 7. Node projects ──────────────────────────────────────────────────────────

Write-Step "[7/7] Admin portal and mobile app (npm)"
if ($SkipNode) { Write-Info "Skipped (-SkipNode)" }
elseif ($HasNode) {
    Install-NodeProject $AdminDir 'admin'
    Install-NodeProject $AppDir 'app'
}

# ── Summary ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
if ($Errors.Count -eq 0) { Write-Host "  Setup complete!" -ForegroundColor Green }
else { Write-Host "  Setup finished with $($Errors.Count) error(s)" -ForegroundColor Red }
Write-Host "=========================================" -ForegroundColor Cyan
foreach ($e in $Errors) { Write-Host "  ERROR:   $e" -ForegroundColor Red }
foreach ($w in $Warnings) { Write-Host "  WARNING: $w" -ForegroundColor Yellow }
Write-Host ""
Write-Host "  Optional settings (Google sign-in, payments, email) live in platform-api\.env." -ForegroundColor Gray
if ($Errors.Count -eq 0) {
    Write-Host "  Next: run .\start-dev.bat" -ForegroundColor Magenta
} else {
    Write-Host "  Fix the errors above, then re-run .\setup-dev.bat" -ForegroundColor Magenta
}
Write-Host ""

if ($Errors.Count -gt 0) { exit 1 }
