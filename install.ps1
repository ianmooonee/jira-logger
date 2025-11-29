# JIRA Logger - Automated Installation Script
# This script installs all dependencies and sets up the application

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  JIRA Logger - Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    } catch {
        return $false
    }
}

# Function to print status messages
function Write-Status {
    param($Message, $Type = "Info")
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Type) {
        "Success" { Write-Host "[$timestamp] [OK] $Message" -ForegroundColor Green }
        "Error"   { Write-Host "[$timestamp] [ERROR] $Message" -ForegroundColor Red }
        "Warning" { Write-Host "[$timestamp] [WARN] $Message" -ForegroundColor Yellow }
        default   { Write-Host "[$timestamp] [INFO] $Message" -ForegroundColor Cyan }
    }
}

# Check Python installation
Write-Status "Checking Python installation..."
if (-not (Test-Command "python")) {
    Write-Status "Python is not installed or not in PATH!" "Error"
    Write-Host ""
    Write-Host "Please install Python 3.10 or newer from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Make sure to check 'Add Python to PATH' during installation!" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$pythonVersion = python --version 2>&1
Write-Status "Found: $pythonVersion" "Success"

# Verify Python version
$versionMatch = $pythonVersion -match "Python (\d+)\.(\d+)"
if ($versionMatch) {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 10)) {
        Write-Status "Python 3.10 or newer is required. You have Python $major.$minor" "Error"
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check Node.js installation
Write-Status "Checking Node.js installation..."
if (-not (Test-Command "node")) {
    Write-Status "Node.js is not installed or not in PATH!" "Error"
    Write-Host ""
    Write-Host "Please install Node.js 18 or newer from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Choose the LTS (Long Term Support) version!" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$nodeVersion = node --version 2>&1
Write-Status "Found: Node.js $nodeVersion" "Success"

# Check npm installation
Write-Status "Checking npm installation..."
if (-not (Test-Command "npm")) {
    Write-Status "npm is not installed!" "Error"
    Write-Host ""
    Write-Host "npm should come with Node.js. Please reinstall Node.js." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$npmVersion = npm --version 2>&1
Write-Status "Found: npm v$npmVersion" "Success"
Write-Host ""

# Set up .env file
Write-Status "Setting up environment configuration..."
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Status "Created .env file from .env.example" "Success"
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Edit .env file and set your JIRA_PAT!" -ForegroundColor Yellow
        Write-Host "   Open .env in Notepad and replace 'your-personal-access-token-here'" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Status ".env.example file not found. You'll need to create .env manually." "Warning"
    }
} else {
    Write-Status ".env file already exists (skipping)" "Success"
}

# Create Python virtual environment
Write-Status "Creating Python virtual environment..."
if (Test-Path "venv") {
    Write-Status "Virtual environment already exists (skipping)" "Success"
} else {
    try {
        python -m venv venv
        Write-Status "Virtual environment created successfully" "Success"
    } catch {
        Write-Status "Failed to create virtual environment" "Error"
        Write-Host ""
        Write-Host "Error details: $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Activate virtual environment
Write-Status "Activating virtual environment..."
$activateScript = ".\venv\Scripts\Activate.ps1"

if (-not (Test-Path $activateScript)) {
    Write-Status "Activation script not found!" "Error"
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    & $activateScript
    Write-Status "Virtual environment activated" "Success"
} catch {
    Write-Status "Failed to activate virtual environment" "Warning"
    Write-Host ""
    Write-Host "You may need to run:" -ForegroundColor Yellow
    Write-Host "  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Attempting to install anyway..." -ForegroundColor Yellow
}

Write-Host ""

# Install Python dependencies
Write-Status "Installing Python dependencies (this may take 2-5 minutes)..."
if (-not (Test-Path "requirements.txt")) {
    Write-Status "requirements.txt not found!" "Error"
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    # Upgrade pip first
    Write-Status "Upgrading pip..."
    python -m pip install --upgrade pip --quiet
    
    # Install requirements
    Write-Status "Installing packages from requirements.txt..."
    python -m pip install -r requirements.txt --quiet
    Write-Status "Python dependencies installed successfully" "Success"
} catch {
    Write-Status "Failed to install Python dependencies" "Error"
    Write-Host ""
    Write-Host "Error details: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running manually:" -ForegroundColor Yellow
    Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install frontend dependencies
Write-Status "Installing frontend dependencies (this may take 2-5 minutes)..."
if (-not (Test-Path "frontend")) {
    Write-Status "frontend directory not found!" "Error"
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    Push-Location frontend
    
    if (-not (Test-Path "package.json")) {
        Write-Status "package.json not found in frontend directory!" "Error"
        Pop-Location
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Status "Running npm install..."
    npm install --silent
    Write-Status "Frontend dependencies installed successfully" "Success"
    
    Pop-Location
} catch {
    Pop-Location
    Write-Status "Failed to install frontend dependencies" "Error"
    Write-Host ""
    Write-Host "Error details: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running manually:" -ForegroundColor Yellow
    Write-Host "  cd frontend" -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Final instructions
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Edit the .env file and set your JIRA Personal Access Token:" -ForegroundColor White
Write-Host "   - Open .env in Notepad" -ForegroundColor Gray
Write-Host "   - Find: JIRA_PAT=your-personal-access-token-here" -ForegroundColor Gray
Write-Host "   - Replace with your actual JIRA token" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run the application:" -ForegroundColor White
Write-Host "   .\start.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Open your browser to:" -ForegroundColor White
Write-Host "   http://localhost:5173" -ForegroundColor Yellow
Write-Host ""

# Check if .env needs configuration
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "your-personal-access-token-here") {
        Write-Host "[!] WARNING: You still need to configure your JIRA token in .env!" -ForegroundColor Yellow
        Write-Host ""
    }
}

Write-Host "For detailed instructions, see: README.md" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
