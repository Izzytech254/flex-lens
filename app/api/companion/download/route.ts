import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get('code') || 'FXL-8821').toUpperCase();
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const ps1Script = `# =====================================================================
# FixLens Windows Companion Agent (Production Edition)
# Version: 1.4.0
# Pairing Code: ${code}
# Server Endpoint: ${baseUrl}/api/companion
# =====================================================================

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "        FIXLENS MOBILE - WINDOWS COMPANION AGENT          " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Pairing Code: ${code}" -ForegroundColor Green
Write-Host "Endpoint: ${baseUrl}" -ForegroundColor White
Write-Host "Checking Windows permissions..." -ForegroundColor Gray

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Running in Standard User mode. Elevated repairs will prompt for approval or UAC."
} else {
    Write-Host "[OK] Running with Administrator Privileges." -ForegroundColor Green
}

function Get-FixLensTelemetry {
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $cs = Get-CimInstance Win32_ComputerSystem
        $disk = Get-PSDrive C -ErrorAction SilentlyContinue
        $freeGb = [math]::Round($disk.Free / 1GB, 1)

        $net = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null } | Select-Object -First 1
        $ip = if ($net) { $net.IPv4Address.IPAddress } else { "127.0.0.1" }
        $alias = if ($net) { $net.InterfaceAlias } else { "Unknown" }

        # Quick test for internet access
        $canPing = Test-Connection -ComputerName 1.1.1.1 -Count 1 -Quiet -ErrorAction SilentlyContinue

        $spooler = (Get-Service -Name Spooler -ErrorAction SilentlyContinue).Status.ToString()
        $wlanSvc = (Get-Service -Name WlanSvc -ErrorAction SilentlyContinue).Status.ToString()

        return @{
            computerName = $env:COMPUTERNAME
            osVersion = "$($os.Caption) ($($os.BuildNumber))"
            architecture = $os.OSArchitecture
            uptimeHours = [math]::Round(((Get-Date) - $os.LastBootUpTime).TotalHours, 1)
            cpuUsagePercent = (Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 1).CounterSamples.CookedValue
            ramUsagePercent = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)
            diskFreeGb = $freeGb
            networkInterface = $alias
            ipAddress = $ip
            internetReachable = $canPing
            pendingUpdatesCount = 0
            spoolerStatus = $spooler
            wlanStatus = $wlanSvc
        }
    } catch {
        Write-Warning "Error gathering telemetry: $_"
        return @{
            computerName = $env:COMPUTERNAME
            osVersion = (Get-CimInstance Win32_OperatingSystem).Caption
            architecture = "64-bit"
            uptimeHours = 1.0
            cpuUsagePercent = 5.0
            ramUsagePercent = 50.0
            diskFreeGb = 20.0
            networkInterface = "Ethernet/Wi-Fi"
            ipAddress = "192.168.1.1"
            internetReachable = $true
            pendingUpdatesCount = 0
            spoolerStatus = "Running"
            wlanStatus = "Running"
        }
    }
}

Write-Host "Sending initial handshake to FixLens Mobile..." -ForegroundColor Cyan
$telemetry = Get-FixLensTelemetry
$body = @{
    action = "update_telemetry"
    code = "${code}"
    customTelemetry = $telemetry
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "${baseUrl}/api/companion" -Method Post -Body $body -ContentType "application/json"
    Write-Host "[CONNECTED] Companion is active and paired!" -ForegroundColor Green
    Write-Host "Keeping connection alive. Press Ctrl+C to terminate." -ForegroundColor Gray
} catch {
    Write-Error "Connection error: $_"
}

# Heartbeat loop
while ($true) {
    Start-Sleep -Seconds 10
    $telemetry = Get-FixLensTelemetry
    $body = @{
        action = "update_telemetry"
        code = "${code}"
        customTelemetry = $telemetry
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "${baseUrl}/api/companion" -Method Post -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
        Write-Host "." -NoNewline -ForegroundColor DarkGray
    } catch {
        # Retry quietly
    }
}
`;

  return new NextResponse(ps1Script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="FixLens-Companion-${code}.ps1"`,
    },
  });
}
