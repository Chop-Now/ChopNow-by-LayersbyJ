# ChopNow Release Build Script
# Usage: .\scripts\build_release.ps1 -Platform android|ios|both

param(
  [Parameter(Mandatory=$true)]
  [ValidateSet("android","ios","both")]
  [string]$Platform,

  [string]$ApiUrl = "https://api.chopnow.app/api/v1",
  [string]$SocketUrl = "https://api.chopnow.app"
)

$dartDefines = "--dart-define=API_BASE_URL=$ApiUrl --dart-define=SOCKET_URL=$SocketUrl"

Write-Host "Building ChopNow for: $Platform" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Yellow

if ($Platform -eq "android" -or $Platform -eq "both") {
    Write-Host "`nBuilding Android APK..." -ForegroundColor Green
    Invoke-Expression "flutter build apk --release $dartDefines"
    Write-Host "`nBuilding Android App Bundle (Play Store)..." -ForegroundColor Green
    Invoke-Expression "flutter build appbundle --release $dartDefines"
}

if ($Platform -eq "ios" -or $Platform -eq "both") {
    Write-Host "`nBuilding iOS IPA..." -ForegroundColor Green
    Invoke-Expression "flutter build ipa --release $dartDefines"
}

Write-Host "`nBuild complete!" -ForegroundColor Cyan
