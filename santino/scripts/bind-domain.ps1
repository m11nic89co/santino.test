<#
Usage: copy scripts/creds.local.example.json to scripts/creds.local.json, fill login/password or api_token, then run in PowerShell:
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\scripts\bind-domain.ps1

This script is intentionally conservative: if no API token is present it will only print manual steps.
It does not transmit credentials to any third party.
#>

param()

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$credsPath = Join-Path $root 'creds.local.json'

if (-not (Test-Path $credsPath)) {
    Write-Host "Please create '$credsPath' by copying 'creds.local.example.json' and filling credentials." -ForegroundColor Yellow
    exit 1
}

$creds = Get-Content $credsPath -Raw | ConvertFrom-Json
$domain = $creds.domain
$docRoot = $creds.document_root

Write-Host "Domain: $domain" -ForegroundColor Cyan
Write-Host "Document root: $docRoot" -ForegroundColor Cyan

if ($creds.regru.api_token -and $creds.regru.api_token.Trim().Length -gt 0) {
    Write-Host "API token detected — attempting API-based operations (Reg.ru)." -ForegroundColor Green
    # Example: query DNS records via Reg.ru API (non-destructive). Replace with real API endpoints if available.
    $apiToken = $creds.regru.api_token
    $headers = @{ 'Authorization' = "Bearer $apiToken" }
    try {
        Write-Host "Fetching DNS records for $domain (read-only)..."
        # Note: this is a placeholder URL — real Reg.ru API endpoints must be used if available for your account
        $resp = Invoke-RestMethod -Uri "https://api.reg.ru/api/v5/domains/$domain/dns" -Headers $headers -Method Get -ErrorAction Stop
        Write-Host "API response (sample):`n" -NoNewline
        $resp | ConvertTo-Json -Depth 3
    } catch {
        Write-Host "API request failed or API endpoint differs for your account. Will fallback to printing manual steps." -ForegroundColor Yellow
    }
    Write-Host "\nIf API calls succeeded, you'd next set A-record @ -> 37.140.192.190 and www -> same IP, then bind domain in hosting panel to $docRoot and request Let's Encrypt." -ForegroundColor Green
} else {
    Write-Host "No API token provided — printing manual steps to perform in Reg.ru panel:" -ForegroundColor Yellow
    Write-Host "1) Login to panel: $($creds.regru.panel_url)"
    Write-Host "2) Set DNS A records for domain ${domain}:"
    Write-Host "   - A @ -> 37.140.192.190"
    Write-Host "   - A www -> 37.140.192.190"
    Write-Host "3) In hosting panel: bind domain ${domain} and set Document Root to: ${docRoot}"
    Write-Host "4) In hosting panel: enable Let's Encrypt / SSL for ${domain}"
    Write-Host "5) After changes, run the following on your machine to verify DNS and HTTP/HTTPS:\n"
    Write-Host "   Resolve-DnsName ${domain} -Type A" -ForegroundColor Gray
    Write-Host "   Invoke-WebRequest -Uri 'https://${domain}' -UseBasicParsing -TimeoutSec 15 | Select StatusCode" -ForegroundColor Gray
    Write-Host "   (If you have SSH access to the host, run: ls -la ${docRoot})" -ForegroundColor Gray
}

Write-Host "\nWhen you've completed the panel steps, paste the outputs here and I'll validate and provide follow-ups." -ForegroundColor Cyan
