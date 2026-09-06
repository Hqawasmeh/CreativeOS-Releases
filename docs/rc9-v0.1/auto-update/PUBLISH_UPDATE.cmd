@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Qanteak OS RC9 V0.1 One-Click Update Publisher
color 0F
set "REPO=Hqawasmeh/CreativeOS-Releases"
set "LOG=%~dp0PUBLISH_LOG.txt"
>"%LOG%" echo Qanteak OS RC9 V0.1 Update Publisher Log
>>"%LOG%" echo Started: %DATE% %TIME%

for /f "delims=" %%V in ('node -p "require('./package.json').version" 2^>nul') do set "VERSION=%%V"
if not defined VERSION goto :failed
set "TAG=v!VERSION!"

echo ============================================================
echo      Qanteak OS RC9 V0.1 One-Click Update Publisher
echo ============================================================
echo Version: !VERSION!
echo Tag: !TAG!
echo.
where node.exe >nul 2>&1 || goto :failed
where npm.cmd >nul 2>&1 || goto :failed
where gh.exe >nul 2>&1 || goto :failed

gh auth status --hostname github.com >>"%LOG%" 2>&1 || goto :failed
gh repo view "%REPO%" >nul 2>>"%LOG%" || goto :failed
gh release view "!TAG!" --repo "%REPO%" >nul 2>&1 && (
 echo [STOP] !TAG! already exists. Increase the version before publishing.
 goto :failed
)

echo [1/7] Installing dependencies...
call npm.cmd install --no-audit --no-fund >>"%LOG%" 2>&1 || goto :failed

echo [2/7] Validating app source...
call npm.cmd run build >>"%LOG%" 2>&1 || goto :failed

echo [3/7] Checking signing configuration...
call node scripts\signing-preflight.mjs >>"%LOG%" 2>&1 || goto :failed
if not defined CSC_LINK if not defined WIN_CSC_LINK set "CSC_IDENTITY_AUTO_DISCOVERY=false"

echo [4/7] Building Windows installer ONCE...
call npx.cmd electron-builder --win nsis --x64 --config electron-builder.yml --publish never >>"%LOG%" 2>&1 || goto :failed

set "EXE=release\QanteakOS-Setup-!VERSION!.exe"
set "BLOCK=release\QanteakOS-Setup-!VERSION!.exe.blockmap"
set "YML=release\latest.yml"
if not exist "!EXE!" goto :missing
if not exist "!BLOCK!" goto :missing
if not exist "!YML!" goto :missing

echo [5/7] Verifying release artifacts...
call node scripts\verify-release.mjs release >>"%LOG%" 2>&1 || goto :failed
powershell -NoProfile -ExecutionPolicy Bypass -File VERIFY_WINDOWS_SIGNATURE.ps1 "!EXE!" >>"%LOG%" 2>&1 || goto :failed

echo [6/7] Verifying SHA512 metadata...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$exe='!EXE!'; $y=Get-Content -Raw '!YML!'; $hex=(Get-FileHash $exe -Algorithm SHA512).Hash; $bytes=for($i=0;$i -lt $hex.Length;$i+=2){[Convert]::ToByte($hex.Substring($i,2),16)}; $b64=[Convert]::ToBase64String($bytes); if($y -notmatch [regex]::Escape($b64)){Write-Error 'latest.yml SHA512 does not match installer'; exit 20}; $size=(Get-Item $exe).Length; if($y -notmatch ('size:\s*'+$size+'\b')){Write-Error 'latest.yml size does not match installer'; exit 21}; Write-Host '[OK] Installer metadata matches.'" >>"%LOG%" 2>&1 || goto :failed

echo [7/7] Creating GitHub release and uploading matched assets...
gh release create "!TAG!" "!EXE!" "!BLOCK!" "!YML!" --repo "%REPO%" --title "Qanteak OS RC9 V0.1" --prerelease --target main --notes-file "CHANGELOG-RC9-V0.1.md" >>"%LOG%" 2>&1 || goto :failed

gh release view "!TAG!" --repo "%REPO%" --json url,assets --jq ".url, (.assets[].name)"
echo.
echo SUCCESS - Qanteak OS RC9 V0.1 is live for auto-update.
pause
exit /b 0

:missing
echo [ERROR] One or more required update files are missing.
goto :failed
:failed
echo.
echo ============================================================
echo PUBLISH STOPPED
echo Review: %LOG%
echo ============================================================
pause
exit /b 1
