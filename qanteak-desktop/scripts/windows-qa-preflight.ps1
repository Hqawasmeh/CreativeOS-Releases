$ErrorActionPreference = 'Stop'
Write-Host 'Qanteak OS RC9 V0.13 Windows QA preflight'
Write-Host ('Windows: ' + [System.Environment]::OSVersion.VersionString)
Write-Host ('PowerShell: ' + $PSVersionTable.PSVersion)
$exe = Get-ChildItem -Path '.\release' -Filter 'QanteakOS-Setup-1.0.0-rc.9.13.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($exe) {
  $sig = Get-AuthenticodeSignature -LiteralPath $exe.FullName
  Write-Host ('Installer: ' + $exe.FullName)
  Write-Host ('Authenticode: ' + $sig.Status)
  Write-Host ('SHA256: ' + (Get-FileHash -Algorithm SHA256 -LiteralPath $exe.FullName).Hash)
} else {
  Write-Warning 'V0.13 installer not built yet. Run the publisher first.'
}
Write-Host 'Next: follow WINDOWS_QA_CHECKLIST.md on a clean PC.'
