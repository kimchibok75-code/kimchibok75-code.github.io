# 치복 타운 테스트 서버 켜기 (이 컴퓨터 안에서만, 진짜 서버와 따로)
$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
function Test-Port($p) { $c = New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', $p); $true } catch { $false } finally { $c.Close() } }

Write-Host '치복 타운 테스트 서버를 켜는 중이에요...' -ForegroundColor Yellow
if (-not (Test-Port 5173)) {
  Start-Process powershell -WindowStyle Minimized -WorkingDirectory $root -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = '테스트 - 화면 (닫지 마세요)'; node scripts/serve.mjs"
}
if (-not (Test-Port 8787)) {
  Start-Process powershell -WindowStyle Minimized -WorkingDirectory (Join-Path $root 'game-worker') -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = '테스트 - 게임 서버 (닫지 마세요)'; npx --yes wrangler@4.45.0 dev --local --port 8787"
}
$ok = $false
for ($i = 0; $i -lt 90; $i++) {
  try { if ((Invoke-WebRequest 'http://localhost:8787/api/health' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 -and (Test-Port 5173)) { $ok = $true; break } } catch {}
  Start-Sleep -Seconds 1
}
if (-not $ok) { Write-Host '서버가 켜지지 않았어요. 작업 표시줄의 "테스트 - 게임 서버" 창을 Claude에게 보여 주세요.' -ForegroundColor Red; Read-Host '엔터를 누르면 닫혀요'; exit }

$url = 'http://localhost:5173/game.html?api=http://localhost:8787'
$chrome = @("$env:ProgramFilesGoogleChromeApplicationchrome.exe", "${env:ProgramFiles(x86)}GoogleChromeApplicationchrome.exe", "$env:LOCALAPPDATAGoogleChromeApplicationchrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) { Start-Process $chrome -ArgumentList "--app=$url", "--user-data-dir=$env:LOCALAPPDATAChibokTownTest", '--window-size=1500,900' } else { Start-Process $url }
Write-Host '열렸어요! 다 쓰면 작업 표시줄의 "테스트 - ..." 창 2개를 닫으면 꺼져요.' -ForegroundColor Green
Start-Sleep -Seconds 4
