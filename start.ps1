# Quick Start Script for JIRA Logger
# This script helps you get started quickly

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "   JIRA Logger - Quick Start" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if this is first run
$envExists = Test-Path ".env"
$nodeModulesExists = Test-Path "frontend/node_modules"
$venvExists = Test-Path "venv"

if (-not $envExists) {
    Write-Host "[!] First time setup detected" -ForegroundColor Yellow
    Write-Host ""
    
    # Setup .env
    if (Test-Path ".env.example") {
        Write-Host "[1/3] Creating .env file..." -ForegroundColor Green
        Copy-Item ".env.example" ".env"
        Write-Host "    ✓ .env created. Please edit it with your JIRA PAT!" -ForegroundColor Green
    }
    
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

# Check .env configuration
Write-Host "[→] Checking configuration..." -ForegroundColor Cyan
$envContent = Get-Content ".env" -Raw
if ($envContent -match "your-personal-access-token-here") {
    Write-Host ""
    Write-Host "⚠️  WARNING: Default JIRA_PAT detected!" -ForegroundColor Yellow
    Write-Host "   Please edit .env and add your actual JIRA Personal Access Token" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Exiting. Please configure .env first." -ForegroundColor Red
        exit
    }
}

# Clear any existing JIRA_PAT environment variable to ensure .env is used
if ($env:JIRA_PAT) {
    Write-Host "[→] Clearing existing JIRA_PAT environment variable (using .env instead)..." -ForegroundColor Cyan
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
