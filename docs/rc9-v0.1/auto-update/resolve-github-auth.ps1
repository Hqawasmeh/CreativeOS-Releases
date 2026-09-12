$ErrorActionPreference = 'SilentlyContinue'
function Emit-Token([string]$Token) {
  if (-not [string]::IsNullOrWhiteSpace($Token)) {
    [Console]::Out.WriteLine($Token.Trim())
    exit 0
  }
}
Emit-Token $env:GH_TOKEN
Emit-Token $env:GITHUB_TOKEN
$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  $token = (& gh auth token 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -eq 0) { Emit-Token $token }
}
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) {
  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $git.Source
    $psi.Arguments = 'credential fill'
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    [void]$p.Start()
    $p.StandardInput.WriteLine('protocol=https')
    $p.StandardInput.WriteLine('host=github.com')
    $p.StandardInput.WriteLine('')
    $p.StandardInput.Close()
    $stdout = $p.StandardOutput.ReadToEnd()
    $p.WaitForExit()
    if ($p.ExitCode -eq 0) {
      foreach ($line in ($stdout -split "`r?`n")) {
        if ($line -match '^password=(.+)$') { Emit-Token $matches[1] }
      }
    }
  } catch {}
}
exit 1
