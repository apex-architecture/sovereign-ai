Add-Type -Path "$PSScriptRoot\win.cs" -ReferencedAssemblies System.Drawing,System.Core
$target = $null
foreach ($h in [Win]::All()) { if ([Win]::Title($h) -match 'Dailies') { $target = $h; break } }
if (-not $target) { Write-Output "NO_WINDOW"; exit }
[void][Win]::ShowWindow($target, 3)
[void][Win]::SetForegroundWindow($target)
Start-Sleep -Seconds 2
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$b = [Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object Drawing.Bitmap $b.Width, $b.Height
$g = [Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.X, $b.Y, 0, 0, $bmp.Size)
$bmp.Save("D:\ApexEmpire\films\lllppp\runs\2026-11-01T21-13\window-front.png", [Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output ("FOREGROUNDED " + [Win]::Title($target))
