; Qanteak OS RC9 V0.8 installer/update safety hooks.
;
; electron-builder's stock NSIS running-app check can produce a false
; "Qanteak OS cannot be closed" dialog during upgrades, including cases where
; only the previous uninstaller is present. We replace that stock check with an
; exact Qanteak-process shutdown so the installer does not confuse
; "Uninstall Qanteak OS.exe" (or similarly named processes) with the app.
;
; electron-builder supports overriding CHECK_APP_RUNNING through the
; customCheckAppRunning macro. The normal upgrade/uninstall flow remains intact.

!macro QanteakKillExactProcesses
  ; Exact image names only. A non-zero taskkill exit code simply means the image
  ; was not running, which is safe during install/update.
  nsExec::ExecToStack `"$SYSDIR\taskkill.exe" /F /T /IM "Qanteak OS.exe"`
  Pop $0
  Pop $1
  nsExec::ExecToStack `"$SYSDIR\taskkill.exe" /F /T /IM "Uninstall Qanteak OS.exe"`
  Pop $0
  Pop $1
!macroend

!macro customCheckAppRunning
  ; Auto-update path: give Electron a chance to finish quitting first.
  Sleep 900

  ; Close only the exact Qanteak application/uninstaller images.
  !insertmacro QanteakKillExactProcesses
  Sleep 1400

  ; Repeat for slower PCs / antivirus handle release.
  !insertmacro QanteakKillExactProcesses
  Sleep 1400

  ; Do not call electron-builder's default fuzzy app check here. That stock
  ; check is the source of the false "cannot be closed" retry loop.
!macroend

!macro customInit
  ; Manual installer path: clean up stale Qanteak processes at startup too.
  !insertmacro QanteakKillExactProcesses
  Sleep 1200
!macroend
