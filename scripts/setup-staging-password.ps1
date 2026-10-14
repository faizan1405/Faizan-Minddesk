param(
    [Parameter(Mandatory = $false)]
    [string]$Password
)

# MindDesk Milestone 1: Secure Staging Password Entry & Verification Runner
# Prompts for staging password securely using a masked prompt (hidden input)
# and runs the real MySQL verification suite against Hostinger staging DB.

$ErrorActionPreference = "Stop"

trap {
    Write-Host "`n============================================================" -ForegroundColor Red
    Write-Host " [FATAL ERROR] An unexpected error occurred: $_" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    exit 1
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " MindDesk Staging Database Verification                      " -ForegroundColor Cyan
Write-Host " Target Host: srv469.hstgr.io:3306                           " -ForegroundColor Cyan
Write-Host " Target DB:   u256504187_minddesk_test                       " -ForegroundColor Cyan
Write-Host " Target User: u256504187_staging_user                        " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($Password) {
    $plainPass = $Password
} else {
    Write-Host "Your input will be masked and will NOT be echoed to the console.`n" -ForegroundColor DarkGray
    $securePass = Read-Host "Enter staging password (hidden)" -AsSecureString
    if (-not $securePass) {
        Write-Host "`n[ERROR] No password was entered. Verification aborted." -ForegroundColor Red
        exit 1
    }
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
    $plainPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if (-not $plainPass -or $plainPass.Trim().Length -eq 0) {
    Write-Host "`n[ERROR] Empty password was provided. Verification aborted." -ForegroundColor Red
    exit 1
}

$encodedPass = [System.Uri]::EscapeDataString($plainPass)
$stagingUrl = "mysql://u256504187_staging_user:$encodedPass@srv469.hstgr.io:3306/u256504187_minddesk_test"

# Immediately destroy plain password in memory
$plainPass = $null

# Write to git-ignored .env.staging
Set-Content -Path ".env.staging" -Value "STAGING_DATABASE_URL=$stagingUrl" -Force
Write-Host "`n[INFO] STAGING_DATABASE_URL saved to .env.staging [git-ignored]." -ForegroundColor Green
Write-Host "[INFO] Launching real MySQL staging verification runner...`n" -ForegroundColor Yellow

$env:STAGING_DATABASE_URL = $stagingUrl
& npx tsx scripts/verify-staging-mysql.ts

$runnerExitCode = $LASTEXITCODE

if ($runnerExitCode -ne 0) {
    Write-Host "`n============================================================" -ForegroundColor Red
    Write-Host " STAGING VERIFICATION FAILED (Exit Code: $runnerExitCode)   " -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    exit $runnerExitCode
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " ALL REAL MYSQL STAGING CHECKS PASSED SUCCESSFULLY          " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
exit 0
