# PowerShell script to kill process using a specific port
param(
    [int]$Port = 4001
)

Write-Host "Checking for processes using port $Port..." -ForegroundColor Yellow

# Find process using the port
$connection = netstat -ano | findstr ":$Port"
if ($connection) {
    $lines = $connection -split "`n"
    foreach ($line in $lines) {
        if ($line -match '\s+(\d+)\s*$') {
            $pid = $matches[1]
            Write-Host "Found process with PID: $pid" -ForegroundColor Cyan
            
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Green
                $confirm = Read-Host "Kill this process? (Y/N)"
                if ($confirm -eq 'Y' -or $confirm -eq 'y') {
                    Stop-Process -Id $pid -Force
                    Write-Host "✅ Process killed successfully!" -ForegroundColor Green
                } else {
                    Write-Host "❌ Process not killed." -ForegroundColor Red
                }
            }
        }
    }
} else {
    Write-Host "✅ No process found using port $Port" -ForegroundColor Green
}
