# Quick Start Script for JIRA Logger
# This script helps you get started quickly

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "   JIRA Logger - Quick Start" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if this is first run
$configExists = Test-Path "config.json"
$nodeModulesExists = Test-Path "frontend/node_modules"
$venvExists = Test-Path "venv"

if (-not $configExists) {
    Write-Host "[!] First time setup detected" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[Note] config.json will be created automatically on first run" -ForegroundColor Green
    Write-Host "       Please edit it with your JIRA PAT after first startup!" -ForegroundColor Green
    Write-Host ""
    
    # Setup Python venv
    if (-not $venvExists) {
        Write-Host "[2/3] Creating Python virtual environment..." -ForegroundColor Green
        python -m venv venv
        Write-Host "    ✓ Virtual environment created" -ForegroundColor Green
    }
    
    # Install Python deps
    Write-Host "[3/3] Installing Python dependencies..." -ForegroundColor Green
    & ".\venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
    Write-Host "    ✓ Python dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# Check Node modules
if (-not $nodeModulesExists) {
    Write-Host "[!] Installing frontend dependencies..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
    Write-Host "    ✓ Frontend dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# Check config.json configuration
if (Test-Path "config.json") {
    Write-Host "[→] Checking configuration..." -ForegroundColor Cyan
    $configContent = Get-Content "config.json" -Raw
    if ($configContent -match '"your-personal-access-token"') {
        Write-Host ""
        Write-Host "⚠️  WARNING: Default jira_pat detected!" -ForegroundColor Yellow
        Write-Host "   Please edit config.json and add your actual JIRA Personal Access Token" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") {
            Write-Host "Exiting. Please configure config.json first." -ForegroundColor Red
            exit
        }
    }
}

# Clear any existing JIRA_PAT environment variable to ensure config.json is used
if ($env:JIRA_PAT) {
    Write-Host "[→] Clearing existing JIRA_PAT environment variable (using config.json instead)..." -ForegroundColor Cyan
    $env:JIRA_PAT = $null
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "   Starting JIRA Logger" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend will start on: http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend will start on: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Start backend in background
Write-Host "[→] Starting backend server..." -ForegroundColor Cyan
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

Start-Sleep -Seconds 3

# Start frontend in background
Write-Host "[→] Starting frontend server..." -ForegroundColor Cyan
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev" -PassThru

Write-Host ""
Write-Host "[OK] Both servers started!" -ForegroundColor Green
Write-Host ""
Write-Host "Open your browser to: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop servers, close both PowerShell windows or press Ctrl+C" -ForegroundColor Yellow
Write-Host ""
