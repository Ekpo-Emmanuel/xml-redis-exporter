param(
  [switch]$v,
  [Parameter(Position = 0)]
  [string]$XmlPath
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not $XmlPath) {
  Write-Error "Usage: export.ps1 [-v] /path/to/xml"
  exit 1
}
if (-not (Test-Path -LiteralPath $XmlPath -PathType Leaf)) {
  Write-Error "File not found: $XmlPath"
  exit 1
}

$xmlAbs = (Resolve-Path -LiteralPath $XmlPath).Path
$cliArgs = @("src/cli.js", $xmlAbs)
if ($v) {
  $cliArgs += "-v"
}

function Test-PortOpen([int]$Port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(400)
    $connected = $ok -and $client.Connected
    $client.Close()
    return $connected
  } catch {
    return $false
  }
}

function Get-PortableRedis {
  $tools = Join-Path $Root "tools\redis"
  $server = Join-Path $tools "redis-server.exe"
  if (Test-Path $server) {
    return $server
  }

  New-Item -ItemType Directory -Force -Path $tools | Out-Null
  $zip = Join-Path $env:TEMP "redis-win-x64.zip"
  $url = "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip"
  Invoke-WebRequest -Uri $url -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $tools -Force
  if (-not (Test-Path $server)) {
    throw "Failed to unpack portable Redis"
  }
  return $server
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
  docker compose up -d redis
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    $ping = docker compose exec -T redis redis-cli ping 2>$null
    if ("$ping" -match "PONG") {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    Write-Error "Redis did not become ready"
    exit 1
  }
  $env:REDIS_HOST = "localhost"
  & node @cliArgs
  exit $LASTEXITCODE
}

if (-not (Test-PortOpen 6379)) {
  $redisServer = Get-PortableRedis
  $toolsDir = Split-Path $redisServer
  $stdout = Join-Path $toolsDir "stdout.txt"
  $stderr = Join-Path $toolsDir "stderr.txt"
  $conf = Join-Path $toolsDir "redis.windows.conf"
  Start-Process -FilePath $redisServer -WorkingDirectory $toolsDir `
    -ArgumentList $conf `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden | Out-Null
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    if (Test-PortOpen 6379) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    Write-Error "Redis did not become ready"
    exit 1
  }
}

$env:REDIS_HOST = "localhost"
& node @cliArgs
exit $LASTEXITCODE
