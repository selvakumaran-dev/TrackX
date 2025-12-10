# MongoDB Replica Set Setup Script
# Run this as Administrator

$configPath = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"

# Check if already configured
$content = Get-Content $configPath -Raw
if ($content -match "replSetName") {
    Write-Host "Replica set already configured" -ForegroundColor Green
} else {
    # Backup and update config
    Copy-Item $configPath "$configPath.backup" -Force
    Add-Content $configPath "`nreplication:`n  replSetName: rs0"
    Write-Host "Config updated" -ForegroundColor Green
}

# Restart MongoDB
Write-Host "Restarting MongoDB..." -ForegroundColor Yellow
Restart-Service MongoDB -Force
Start-Sleep -Seconds 5

# Initialize replica set
Write-Host "Initializing replica set..." -ForegroundColor Yellow
mongosh --eval "rs.initiate()"

Write-Host "Done!" -ForegroundColor Green
