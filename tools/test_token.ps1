param(
  [Parameter(Mandatory=$true)]
  [string]$Token,

  [string]$Base = "https://jakethecrow-pages.pages.dev"
)

Write-Host ("BASE=" + $Base)
Write-Host ("TOKEN=" + $Token)

$tmp = Join-Path $env:TEMP "body_token.json"
("{""token"":""$Token""}") | Set-Content -Encoding utf8 $tmp

Write-Host "--- POST /api/member/token ---"
curl.exe -sS -X POST "$Base/api/member/token" -H "Content-Type: application/json" --data-binary "@$tmp"
Write-Host ""
