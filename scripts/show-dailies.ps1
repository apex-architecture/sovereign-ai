$exe = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $exe)) { $exe = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $exe)) { Write-Output "NO_EDGE_FOUND"; exit 1 }
$u = "https://filmverse-1mil8xwzv4y.qoder.website/dailies.html"
$a = @("--app=$u", "--start-fullscreen", "--user-data-dir=D:\ApexEmpire\.edge-dailies", "--autoplay-policy=no-user-gesture-required", "--no-first-run")
$p = Start-Process -FilePath $exe -ArgumentList $a -PassThru
Write-Output "PID=$($p.Id)"
Start-Sleep -Seconds 7
$ok = (New-Object -ComObject WScript.Shell).AppActivate($p.Id)
Write-Output "ACTIVATED=$ok"
