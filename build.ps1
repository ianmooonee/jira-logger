# Build Script for JIRA Logger Desktop App
param(
    [switch]$Dev
)

$ErrorActionPreference = "Stop"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "JIRA Logger - Desktop Build" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = $PSScriptRoot

if ($Dev) {
    # Development mode - just install dependencies and run
    Write-Host "[Dev Mode] Installing Electron dependencies..." -ForegroundColor Yellow
    Push-Location electron
    npm install
    Pop-Location
    
    Write-Host ""
    Write-Host "Development setup complete!" -ForegroundColor Green
    Write-Host "To run in dev mode:" -ForegroundColor White
    Write-Host "  cd electron" -ForegroundColor Yellow
    Write-Host "  npm start" -ForegroundColor Yellow
    Write-Host ""
} else {
    # Production build
    Write-Host "[1/3] Building Frontend..." -ForegroundColor Cyan
    Push-Location frontend
    if (-not (Test-Path "node_modules")) {
        npm install
    }
    npm run build
    Pop-Location
    
    Write-Host "[2/3] Building Backend..." -ForegroundColor Cyan
    
    # Activate venv
    & ".\venv\Scripts\Activate.ps1"
    
    # Create spec file if it doesn't exist
    if (-not (Test-Path "jira_logger.spec")) {
        Write-Host "Creating PyInstaller spec file..." -ForegroundColor White
        
        $specContent = @"
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['app/main.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'pydantic',
        'pydantic_core',
        'openpyxl',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='jira_logger',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
"@
        Set-Content -Path "jira_logger.spec" -Value $specContent
    }
    
    & ".\venv\Scripts\pyinstaller.exe" jira_logger.spec --clean --noconfirm
    
    Write-Host "[3/3] Packaging Electron App..." -ForegroundColor Cyan
    
    # Copy files to electron
    $rendererDest = "electron\renderer"
    
    New-Item -ItemType Directory -Force -Path $rendererDest | Out-Null
    
    # Copy backend exe to electron root (will be copied next to .exe)
    Copy-Item "dist\jira_logger.exe" "electron\" -Force
    
    # Copy frontend build
    Copy-Item -Recurse -Force "frontend\dist\*" $rendererDest
    
    # Install electron dependencies and build
    Push-Location electron
    if (-not (Test-Path "node_modules")) {
        npm install
    }
    npm run build
    Pop-Location
    
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "Build Complete!" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installer location: electron\dist" -ForegroundColor Yellow
    Write-Host ""
}
