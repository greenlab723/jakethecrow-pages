param(
  [string]$Base = "https://jakethecrow-pages.pages.dev"
)

Write-Host ("BASE=" + $Base)

Write-Host "--- GET /api/member/token (health) ---"
curl.exe -sS "$Base/api/member/token"
Write-Host ""
