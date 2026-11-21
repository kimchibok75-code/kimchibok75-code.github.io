# 진짜 서버의 김치복·테스트 계정 데이터를 이 컴퓨터 테스트 데이터베이스로 다시 복사
$root = Split-Path -Parent $PSScriptRoot
$c = New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 8787); $on = $true } catch { $on = $false } finally { $c.Close() }
if ($on) { Write-Host '테스트 서버가 켜져 있어요. "테스트 - 게임 서버" 창을 먼저 닫고 다시 해 주세요.' -ForegroundColor Red; Read-Host '엔터를 누르면 닫혀요'; exit }
Write-Host '복사하는 중이에요 (1분쯤 걸려요)...' -ForegroundColor Yellow
Set-Location (Join-Path $root 'game-worker')
npx --yes wrangler@4.45.0 d1 migrations apply kimchibok-game --local | Out-Null
node scripts/copy-to-local.mjs
Read-Host '엔터를 누르면 닫혀요'
