$ErrorActionPreference = 'Stop'
$version = node -p "require('./package.json').version"
Write-Host "Qanteak OS $version Windows artifact QA"
$exe = Join-Path 'release' "QanteakOS-Setup-$version.exe"
if (-not (Test-Path $exe)) { throw "Missing current installer: $exe" }
$sig = Get-AuthenticodeSignature -LiteralPath $exe
Write-Host ('Authenticode: ' + $sig.Status)
Write-Host ('SHA256: ' + (Get-FileHash -Algorithm SHA256 -LiteralPath $exe).Hash)
if ($env:QANTEAK_REQUIRE_SIGNING -eq '1' -and $sig.Status -ne 'Valid') { throw 'A valid signing certificate is required.' }
Write-Host 'Artifact checks complete. Installed-device smoke testing is documented separately in WINDOWS_QA_CHECKLIST.md.'
