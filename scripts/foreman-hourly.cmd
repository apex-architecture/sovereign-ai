@echo off
rem One Foreman pass: measure the spine, repair what is agent-repairable, write the journal.
rem Nothing here opens a window, takes focus, or spends money on a render.
cd /d D:\ApexEmpire\films\lllppp
set PATH=C:\Users\apex1\AppData\Roaming\npm;%PATH%
node --experimental-strip-types scripts\foreman.mjs tick >> .apex-foreman\schedule.log 2>&1
