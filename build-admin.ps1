# Run build as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Restarting as administrator..." -ForegroundColor Yellow
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "Running as Administrator" -ForegroundColor Green
Set-Location $PSScriptRoot

# Clean previous builds
Remove-Item -Recurse -Force dist,build -ErrorAction SilentlyContinue
Remove-Item jira_logger.spec -ErrorAction SilentlyContinue
Remove-Item electron\dist -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item electron\renderer -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item electron\jira_logger.exe -Force -ErrorAction SilentlyContinue

# Run build
& ".\build.ps1"

Write-Host ""
Write-Host "Build complete! Press any key to exit..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
