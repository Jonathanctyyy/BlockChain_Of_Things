# Slither Installation Script for Windows
# Run this in PowerShell with Administrator privileges

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Slither Installation Helper" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found!" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    exit 1
}

# Check if pip is installed
Write-Host "Checking pip installation..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    Write-Host "✓ Found: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ pip not found!" -ForegroundColor Red
    Write-Host "Installing pip..." -ForegroundColor Yellow
    python -m ensurepip --upgrade
}

# Upgrade pip
Write-Host ""
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install pipx (recommended)
Write-Host ""
Write-Host "Installing pipx (recommended for tool isolation)..." -ForegroundColor Yellow
python -m pip install --user pipx
python -m pipx ensurepath

Write-Host ""
Write-Host "Choose installation method:" -ForegroundColor Cyan
Write-Host "1. Install with pipx (recommended)" -ForegroundColor White
Write-Host "2. Install with pip (global)" -ForegroundColor White
Write-Host "3. Skip installation" -ForegroundColor White
$choice = Read-Host "Enter your choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Installing Slither with pipx..." -ForegroundColor Yellow
        pipx install slither-analyzer
        
        Write-Host ""
        Write-Host "Installing solc-select (Solidity version manager)..." -ForegroundColor Yellow
        pipx install solc-select
        
        Write-Host ""
        Write-Host "Setting up Solidity 0.8.28..." -ForegroundColor Yellow
        solc-select install 0.8.28
        solc-select use 0.8.28
    }
    "2" {
        Write-Host ""
        Write-Host "Installing Slither with pip..." -ForegroundColor Yellow
        pip install slither-analyzer
        
        Write-Host ""
        Write-Host "Installing solc-select (Solidity version manager)..." -ForegroundColor Yellow
        pip install solc-select
        
        Write-Host ""
        Write-Host "Setting up Solidity 0.8.28..." -ForegroundColor Yellow
        solc-select install 0.8.28
        solc-select use 0.8.28
    }
    "3" {
        Write-Host "Skipping installation." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Verify installation
Write-Host ""
Write-Host "Verifying Slither installation..." -ForegroundColor Yellow
try {
    $slitherVersion = slither --version 2>&1
    Write-Host "✓ Slither installed successfully: $slitherVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Slither installation failed or not in PATH" -ForegroundColor Red
    Write-Host "Try closing and reopening PowerShell, or add pipx to PATH manually" -ForegroundColor Yellow
    exit 1
}

# Test on the project
Write-Host ""
Write-Host "Would you like to test Slither on this project? (Y/N)" -ForegroundColor Cyan
$test = Read-Host
if ($test -eq "Y" -or $test -eq "y") {
    Write-Host ""
    Write-Host "Running Slither analysis..." -ForegroundColor Yellow
    Write-Host "This may take a minute..." -ForegroundColor Gray
    Write-Host ""
    
    npm run test:slither
    
    Write-Host ""
    Write-Host "Analysis complete! Check slither-report.json and slither-report.md for results." -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm run analyze' to analyze contracts with Slither" -ForegroundColor White
Write-Host "2. See TESTING_GUIDE.md for more information" -ForegroundColor White
Write-Host "3. Check slither.config.json to customize analysis" -ForegroundColor White
Write-Host ""
