param(
    [Parameter(Mandatory = $false)]
    [string]$Password
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " MindDesk Notes Staging MariaDB Verification Suite          " -ForegroundColor Cyan
Write-Host " Target Host: srv469.hstgr.io:3306                           " -ForegroundColor Cyan
Write-Host " Target DB:   u256504187_minddesk_test                       " -ForegroundColor Cyan
Write-Host " Target User: u256504187_staging_user                        " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($env:STAGING_DATABASE_URL -and $env:STAGING_DATABASE_URL -notmatch "MySecretPass12345") {
    Write-Host "[INFO] Using existing STAGING_DATABASE_URL from environment." -ForegroundColor Green
} elseif ($Password) {
    $encodedPass = [System.Uri]::EscapeDataString($Password)
    $env:STAGING_DATABASE_URL = "mysql://u256504187_staging_user:$encodedPass@srv469.hstgr.io:3306/u256504187_minddesk_test"
} else {
    Write-Host "Please provide the staging database password." -ForegroundColor Yellow
    $securePass = Read-Host "Enter staging password (hidden)" -AsSecureString
    if (-not $securePass) {
        Write-Host "`n[ERROR] No password was entered. Verification aborted." -ForegroundColor Red
        exit 1
    }
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
    $plainPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $encodedPass = [System.Uri]::EscapeDataString($plainPass)
    $plainPass = $null
    $env:STAGING_DATABASE_URL = "mysql://u256504187_staging_user:$encodedPass@srv469.hstgr.io:3306/u256504187_minddesk_test"
}

Write-Host "[INFO] Executing scripts/verify-notes-staging-mariadb.ts..." -ForegroundColor Yellow
& npx tsx scripts/verify-notes-staging-mariadb.ts
$exitCode = $LASTEXITCODE

# Clear STAGING_DATABASE_URL from memory
$env:STAGING_DATABASE_URL = $null

exit $exitCode
