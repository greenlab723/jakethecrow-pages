param(
  [string]$Base = "https://jakethecrow-pages.pages.dev"
)

Write-Host ("BASE=" + $Base)

Write-Host "--- GET /api/debug/relay (should be 404) ---"
curl.exe -sS -i "$Base/api/debug/relay" | Select-Object -First 20
Write-Host ""
