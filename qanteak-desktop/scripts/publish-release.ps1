param(
  [Parameter(Mandatory=$true)][string]$Repo,
  [Parameter(Mandatory=$true)][string]$Tag,
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$NotesFile,
  [Parameter(Mandatory=$true)][string]$Exe,
  [Parameter(Mandatory=$true)][string]$Blockmap,
  [Parameter(Mandatory=$true)][string]$LatestYml
)

$ErrorActionPreference = 'Stop'

function Invoke-GhCapture {
  param([Parameter(Mandatory=$true)][string[]]$Arguments)

  $stdoutFile = [System.IO.Path]::GetTempFileName()
  $stderrFile = [System.IO.Path]::GetTempFileName()
  $previousPreference = $ErrorActionPreference

  try {
    # IMPORTANT: gh intentionally writes messages such as "release not found" to stderr.
    # With ErrorActionPreference=Stop, PowerShell can turn that expected stderr into a
    # terminating NativeCommandError before we can inspect $LASTEXITCODE. Temporarily
    # allow native stderr, capture it ourselves, then decide what it means by exit code.
    $ErrorActionPreference = 'Continue'
    & gh @Arguments 1>$stdoutFile 2>$stderrFile
    $exitCode = $LASTEXITCODE

    $stdout = ''
    $stderr = ''
    if (Test-Path -LiteralPath $stdoutFile) {
      $stdout = (Get-Content -LiteralPath $stdoutFile -Raw -ErrorAction SilentlyContinue)
    }
    if (Test-Path -LiteralPath $stderrFile) {
      $stderr = (Get-Content -LiteralPath $stderrFile -Raw -ErrorAction SilentlyContinue)
    }

    return [pscustomobject]@{
      ExitCode = $exitCode
      StdOut   = $stdout
      StdErr   = $stderr
    }
  }
  finally {
    $ErrorActionPreference = $previousPreference
    Remove-Item -LiteralPath $stdoutFile,$stderrFile -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-GhRetry {
  param(
    [Parameter(Mandatory=$true)][string[]]$Arguments,
    [Parameter(Mandatory=$true)][string]$Label,
    [int]$Attempts = 5
  )

  $delays = @(5, 10, 20, 30, 45)
  for ($i = 1; $i -le $Attempts; $i++) {
    Write-Host "[$Label] attempt $i/$Attempts..."
    $result = Invoke-GhCapture -Arguments $Arguments

    if (-not [string]::IsNullOrWhiteSpace($result.StdOut)) {
      Write-Host ($result.StdOut.TrimEnd())
    }

    if ($result.ExitCode -eq 0) {
      return $result
    }

    if (-not [string]::IsNullOrWhiteSpace($result.StdErr)) {
      Write-Warning ($result.StdErr.TrimEnd())
    }

    if ($i -lt $Attempts) {
      $delay = $delays[[Math]::Min($i - 1, $delays.Count - 1)]
      Write-Warning "$Label failed with exit code $($result.ExitCode). Retrying in $delay seconds..."
      Start-Sleep -Seconds $delay
    }
    else {
      throw "$Label failed after $Attempts attempts (exit code $($result.ExitCode))."
    }
  }
}

function Get-ReleaseJson {
  $result = Invoke-GhCapture -Arguments @('release','view',$Tag,'--repo',$Repo,'--json','url,assets')
  if ($result.ExitCode -ne 0) {
    return $null
  }
  if ([string]::IsNullOrWhiteSpace($result.StdOut)) {
    return $null
  }
  return ($result.StdOut | ConvertFrom-Json)
}

foreach ($f in @($NotesFile, $Exe, $Blockmap, $LatestYml)) {
  if (-not (Test-Path -LiteralPath $f)) {
    throw "Required publish file is missing: $f"
  }
}

$release = Get-ReleaseJson
if ($null -eq $release) {
  Write-Host "GitHub release $Tag does not exist yet. Creating it now..."
  Invoke-GhRetry -Label 'create release' -Arguments @(
    'release','create',$Tag,
    '--repo',$Repo,
    '--title',$Title,
    '--prerelease',
    '--target','main',
    '--notes-file',$NotesFile
  ) | Out-Null
}
else {
  Write-Host "GitHub release $Tag already exists. Resuming it without replacing existing binaries."
}

$assets = @(
  (Resolve-Path -LiteralPath $Exe).Path,
  (Resolve-Path -LiteralPath $Blockmap).Path,
  (Resolve-Path -LiteralPath $LatestYml).Path
)

foreach ($assetPath in $assets) {
  $name = [System.IO.Path]::GetFileName($assetPath)
  $release = Get-ReleaseJson
  if ($null -eq $release) {
    throw "Could not read release $Tag before uploading $name."
  }

  $existing = @($release.assets | ForEach-Object { $_.name })
  if ($existing -contains $name) {
    Write-Host "Asset already present; leaving it untouched: $name"
    continue
  }

  $sizeMb = [Math]::Round((Get-Item -LiteralPath $assetPath).Length / 1MB, 1)
  Write-Host "Uploading $name ($sizeMb MB). GitHub CLI may stay silent for several minutes on large installers; do not close this window."
  Invoke-GhRetry -Label "upload $name" -Arguments @(
    'release','upload',$Tag,$assetPath,'--repo',$Repo
  ) | Out-Null
}

$release = Get-ReleaseJson
if ($null -eq $release) {
  throw "Could not verify release $Tag after upload."
}

$names = @($release.assets | ForEach-Object { $_.name })
foreach ($assetPath in $assets) {
  $name = [System.IO.Path]::GetFileName($assetPath)
  if ($names -notcontains $name) {
    throw "Published release is missing required asset: $name"
  }
}

Write-Host "Release publish/resume complete: $($release.url)"
$names | ForEach-Object { Write-Host " - $_" }
