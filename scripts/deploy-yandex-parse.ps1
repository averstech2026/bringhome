# Deploy parse API to Yandex Cloud Functions (Windows).
# Requires: yc init
#
# Usage: .\scripts\deploy-yandex-parse.ps1

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root '.env'

function Read-DotEnvValue([string]$Name) {
  if (-not (Test-Path $EnvFile)) {
    throw ".env not found in $Root"
  }

  foreach ($line in Get-Content $EnvFile) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
    if ($trimmed -match "^${Name}=(.*)$") {
      return $matches[1].Trim().Trim('"').Trim("'")
    }
  }

  throw "Missing in .env: $Name"
}

$FunctionName = if ($env:YC_PARSE_FUNCTION_NAME) { $env:YC_PARSE_FUNCTION_NAME } else { 'bringhome-parse' }
$Runtime = if ($env:YC_PARSE_RUNTIME) { $env:YC_PARSE_RUNTIME } else { 'nodejs22' }
$ApiKey = if ($env:YANDEX_API_KEY) { $env:YANDEX_API_KEY } else { Read-DotEnvValue 'YANDEX_API_KEY' }
$FolderId = if ($env:YANDEX_FOLDER_ID) { $env:YANDEX_FOLDER_ID } else { Read-DotEnvValue 'YANDEX_FOLDER_ID' }

$Yc = Join-Path $env:USERPROFILE 'yandex-cloud\bin\yc.exe'
if (-not (Test-Path $Yc)) {
  $ycCmd = Get-Command yc -ErrorAction SilentlyContinue
  if ($ycCmd) {
    $Yc = $ycCmd.Source
  } else {
    throw 'yc not found. Install Yandex Cloud CLI and run yc init.'
  }
}

$StageDir = Join-Path ([IO.Path]::GetTempPath()) ("yc-parse-deploy-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $StageDir | Out-Null

try {
  Copy-Item (Join-Path $Root 'yandex-cloud\parseProducts\index.js') $StageDir
  Copy-Item (Join-Path $Root 'yandex-cloud\parseProducts\package.json') $StageDir
  Copy-Item (Join-Path $Root 'functions\yandexGpt.js') $StageDir

  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $Yc serverless function create --name $FunctionName 2>&1 | Out-Null
  $ErrorActionPreference = $prevEap

  & $Yc serverless function version create `
    --function-name $FunctionName `
    --runtime $Runtime `
    --entrypoint index.handler `
    --memory 256m `
    --execution-timeout 30s `
    --source-path $StageDir `
    --environment "YANDEX_API_KEY=$ApiKey,YANDEX_FOLDER_ID=$FolderId"

  $ErrorActionPreference = 'Continue'
  & $Yc serverless function allow-unauthenticated-invoke $FunctionName 2>&1 | Out-Null
  $ErrorActionPreference = $prevEap

  $functionJson = & $Yc serverless function get $FunctionName --format json | ConvertFrom-Json
  $Url = "https://functions.yandexcloud.net/$($functionJson.id)"

  Write-Host ''
  Write-Host 'Done. Add to GitHub Secrets:'
  Write-Host "  VITE_YANDEX_PARSE_URL=$Url"
  Write-Host ''
  Write-Host 'Then rebuild GitHub Pages: npm run deploy'
}
finally {
  Remove-Item -Recurse -Force $StageDir -ErrorAction SilentlyContinue
}
