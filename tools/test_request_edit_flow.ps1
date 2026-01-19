param(
  [string]$Base = "https://jakethecrow-pages.pages.dev",

  # メールで届いたURLをそのまま貼る用（例: https://.../?token=xxxx）
  [string]$TokenUrl = "",

  # tokenだけ直接指定したい場合
  [string]$Token = ""
)

Write-Host ("BASE=" + $Base)

# 1) ブラウザでTurnstileテストページを開く（必要なら）
$testUrl = ($Base.TrimEnd("/") + "/test_turnstile")
Write-Host ""
Write-Host "STEP 1) ブラウザでTurnstileを通して request-edit を送るにゃあ:" -ForegroundColor Cyan
Write-Host ("  " + $testUrl)
Write-Host "  （開けてなければ自動で開くにゃあ）"
try { Start-Process $testUrl } catch { }

# 2) token入力
if (-not $Token -and -not $TokenUrl) {
  Write-Host ""
  $TokenUrl = Read-Host "STEP 2) メールで届いたURL（?token=...）を貼ってEnterにゃあ（tokenだけでもOK）"
}

# URLが来たら token を抜く
if (-not $Token -and $TokenUrl) {
  if ($TokenUrl -match 'token=([0-9a-fA-F-]{36})') {
    $Token = $Matches[1]
  } elseif ($TokenUrl -match '^[0-9a-fA-F-]{36}$') {
    $Token = $TokenUrl
  }
}

if (-not $Token) {
  Write-Host ""
  Write-Host "token が取れなかったにゃあ。URL（?token=...）か token（36文字UUID）を入れてにゃあ。" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host ("STEP 3) token を使って view（/api/member/token）を叩くにゃあ: " + $Token) -ForegroundColor Cyan

$tmp = Join-Path $env:TEMP "body_token.json"
("{""token"":""$Token""}") | Set-Content -Encoding utf8 $tmp

Write-Host "--- POST /api/member/token ---"
curl.exe -sS -X POST "$Base/api/member/token" -H "Content-Type: application/json" --data-binary "@$tmp"
Write-Host ""
