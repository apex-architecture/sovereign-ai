Add-Type -Path "$PSScriptRoot\win.cs" -ReferencedAssemblies System.Drawing,System.Core
$out = "$PSScriptRoot\..\runs\2026-11-01T21-13\window-dailies.png"
$found = @()
foreach ($h in [Win]::All()) {
  $t = [Win]::Title($h)
  if ($t -match 'Dailies|Film Verse|qoder\.website') { $found += ,@($h, $t) }
}
if ($found.Count -eq 0) { Write-Output "NO_MATCHING_WINDOW"; exit }
foreach ($f in $found) { Write-Output ("WINDOW: " + $f[1]) }
$target = $found[0][0]
$rect = New-Object Win+RECT
[void][Win]::GetWindowRect($target, [ref]$rect)
Write-Output ("RECT: " + ($rect.R - $rect.L) + "x" + ($rect.B - $rect.T))
[Win]::Shot($target, $out)
Write-Output "PRINTWINDOW_DONE $out"
