# Fleet Manager Startup Script (PowerShell)
# Run: .\start.ps1

# Set Node PATH
$env:PATH = "C:\Program Files\nodejs;C:\Program Files\nodejs\node_modules\npm\bin;$env:PATH"

# Set environment variables
$env:NODE_ENV = "development"
$env:PORT = "8000"
$env:DATABASE_URL = "postgres://postgres:admin@localhost:5432/ahmed"
$env:JWT_SECRET = "dev-jwt-secret-change-in-production"
$env:SESSION_SECRET = "dev-session-secret"

Write-Host "Starting Fleet Manager..." -ForegroundColor Green
Write-Host "Backend: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

# Run dev server
# Run dev server from backend directory
Set-Location -Path "$PSScriptRoot\backend"
npm.cmd run dev
