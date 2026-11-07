import { NextRequest, NextResponse } from 'next/server';
import { CompanionRepairAction, CompanionSystemStats } from '@/types/technician';
import { rateLimit } from '@/lib/rate-limit';

// NOTE: The companion is currently a DEMO. Repair actions are simulated on the server and
// never executed on a real PC. Do not wire real execution until pairing uses per-device
// secrets and approval is verified on the PC side.
const PAIRING_CODE_RE = /^[A-Z0-9-]{4,16}$/;
const MAX_SESSIONS = 500;
const TELEMETRY_KEYS: Array<keyof CompanionSystemStats> = [
  'computerName', 'osVersion', 'architecture', 'uptimeHours', 'cpuUsagePercent', 'ramUsagePercent',
  'diskFreeGb', 'networkInterface', 'ipAddress', 'internetReachable', 'pendingUpdatesCount',
  'spoolerStatus', 'wlanStatus',
];

function sanitizeTelemetry(input: unknown): Partial<CompanionSystemStats> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const key of TELEMETRY_KEYS) {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === 'string') out[key] = v.slice(0, 200);
    else if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    else if (typeof v === 'boolean') out[key] = v;
  }
  return out as Partial<CompanionSystemStats>;
}

// In-memory registry of companion sessions (keyed by pairingCode)
interface CompanionSession {
  pairingCode: string;
  computerName: string;
  connectedAt: string;
  lastHeartbeat: string;
  stats: CompanionSystemStats;
  pendingActions: CompanionRepairAction[];
  executionHistory: Array<{
    actionId: string;
    command: string;
    executedAt: string;
    output: string;
    exitCode: number;
  }>;
}

const sessions = new Map<string, CompanionSession>();

// Initialize a standard default session so connected mode can be tested immediately or paired
const DEFAULT_SESSION_CODE = 'FXL-8821';
sessions.set(DEFAULT_SESSION_CODE, {
  pairingCode: DEFAULT_SESSION_CODE,
  computerName: 'DESKTOP-WIN11-PRO',
  connectedAt: new Date(Date.now() - 3600000).toISOString(),
  lastHeartbeat: new Date().toISOString(),
  stats: {
    computerName: 'DESKTOP-WIN11-PRO',
    osVersion: 'Microsoft Windows 11 Pro 23H2 (Build 22631.3296)',
    architecture: '64-bit Operating System, x64-based processor',
    uptimeHours: 42.5,
    cpuUsagePercent: 18,
    ramUsagePercent: 68,
    diskFreeGb: 14.2,
    networkInterface: 'Intel(R) Wi-Fi 6 AX201 160MHz',
    ipAddress: '192.168.1.145',
    internetReachable: false,
    pendingUpdatesCount: 3,
    spoolerStatus: 'Running',
    wlanStatus: 'Limited Connectivity (No Default Gateway)',
  },
  pendingActions: [],
  executionHistory: [],
});

// Allowlisted verified repair actions
const ALLOWLISTED_COMMANDS: Record<string, { cmd: string; requiresAdmin: boolean; description: string; impact: string }> = {
  'flush-dns': {
    cmd: 'ipconfig /flushdns',
    requiresAdmin: false,
    description: 'Flushes and resets the contents of the DNS client resolver cache.',
    impact: 'Safe. Resolves stale domain name mappings without interrupting active streams.',
  },
  'reset-winsock': {
    cmd: 'netsh winsock reset && netsh int ip reset',
    requiresAdmin: true,
    description: 'Resets the Windows Socket catalog and IP stack back to default configuration.',
    impact: 'Requires computer restart to take final effect. Resolves corrupted network LSP layers.',
  },
  'restart-wlan': {
    cmd: 'Restart-Service -Name "WlanSvc" -Force',
    requiresAdmin: true,
    description: 'Restarts the Windows WLAN AutoConfig service responsible for Wi-Fi discovery and connection.',
    impact: 'Wi-Fi will momentarily disconnect for 3-5 seconds and re-negotiate with the wireless router.',
  },
  'restart-spooler': {
    cmd: 'Stop-Service -Name "Spooler" -Force; Remove-Item -Path "$env:SystemRoot\\System32\\spool\\PRINTERS\\*" -Force -Recurse; Start-Service -Name "Spooler"',
    requiresAdmin: true,
    description: 'Clears hung print queues and restarts the Print Spooler subsystem.',
    impact: 'Pending unprinted print jobs will be discarded. Resolves spooler crash loops.',
  },
  'reset-update-services': {
    cmd: 'Stop-Service -Name "wuauserv", "bits", "cryptsvc" -Force; Start-Service -Name "wuauserv", "bits", "cryptsvc"',
    requiresAdmin: true,
    description: 'Cycles Windows Update, Background Intelligent Transfer, and Cryptographic services.',
    impact: 'Pauses active background downloads and restarts update engine cleanly.',
  },
  'run-sfc-verify': {
    cmd: 'sfc /verifyonly',
    requiresAdmin: true,
    description: 'Scans integrity of all protected system files and logs any corruption without making modifications.',
    impact: 'Non-destructive read-only scan taking 3-5 minutes.',
  },
  'clean-temp': {
    cmd: 'Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue',
    requiresAdmin: false,
    description: 'Frees storage space by purging temporary user application files.',
    impact: 'Safe. Only removes files not currently locked by running processes.',
  },
  'query-drivers-problem': {
    cmd: 'Get-PnpDevice | Where-Object { $_.Status -ne "OK" } | Select-Object FriendlyName, InstanceId, Status, Problem',
    requiresAdmin: false,
    description: 'Scans Device Manager for any hardware reporting error codes (Code 43, Code 10, etc.).',
    impact: 'Read-only diagnostic query.',
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get('code') || DEFAULT_SESSION_CODE).toUpperCase();
  if (!PAIRING_CODE_RE.test(code)) {
    return NextResponse.json({ success: false, error: 'Invalid pairing code' }, { status: 400 });
  }

  const session = sessions.get(code);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Companion session not found' }, { status: 404 });
  }

  // Update heartbeat
  session.lastHeartbeat = new Date().toISOString();

  return NextResponse.json({
    success: true,
    simulated: true,
    session: {
      pairingCode: session.pairingCode,
      computerName: session.computerName,
      connectedAt: session.connectedAt,
      lastHeartbeat: session.lastHeartbeat,
      stats: session.stats,
      executionHistory: session.executionHistory,
      availableActions: Object.entries(ALLOWLISTED_COMMANDS).map(([id, item]) => ({
        id,
        title: id.replace(/-/g, ' ').toUpperCase(),
        description: item.description,
        command: item.cmd,
        requiresAdmin: item.requiresAdmin,
        potentialConsequences: item.impact,
        rollbackPlan: 'Built-in Windows system restoration and service restart.',
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'companion', 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const { action, code = DEFAULT_SESSION_CODE, actionId, userApproved } = body ?? {};
    const customTelemetry = sanitizeTelemetry(body?.customTelemetry);

    const normalizedCode = typeof code === 'string' ? code.toUpperCase() : '';
    if (!PAIRING_CODE_RE.test(normalizedCode)) {
      return NextResponse.json({ error: 'Invalid pairing code.' }, { status: 400 });
    }
    let session = sessions.get(normalizedCode);

    if (!session) {
      if (sessions.size >= MAX_SESSIONS) {
        return NextResponse.json({ error: 'Companion capacity reached. Try again later.' }, { status: 503 });
      }
      // Auto-register session if new
      const baseStats: CompanionSystemStats = {
          computerName: 'WINDOWS-PC-' + normalizedCode.slice(-4),
          osVersion: 'Microsoft Windows 11 (Connected Companion)',
          architecture: '64-bit x64',
          uptimeHours: 12.0,
          cpuUsagePercent: 12,
          ramUsagePercent: 54,
          diskFreeGb: 45.0,
          networkInterface: 'Realtek PCIe GbE Family Controller',
          ipAddress: '192.168.1.100',
          internetReachable: true,
          pendingUpdatesCount: 0,
          spoolerStatus: 'Running',
          wlanStatus: 'Connected',
      };
      const stats: CompanionSystemStats = { ...baseStats, ...customTelemetry };
      session = {
        pairingCode: normalizedCode,
        computerName: stats.computerName,
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        stats,
        pendingActions: [],
        executionHistory: [],
      };
      sessions.set(normalizedCode, session);
    }

    if (action === 'pair') {
      return NextResponse.json({
        success: true,
        message: 'Successfully paired with FixLens Companion.',
        session,
      });
    }

    if (action === 'update_telemetry') {
      if (Object.keys(customTelemetry).length > 0) {
        session.stats = { ...session.stats, ...customTelemetry };
        session.lastHeartbeat = new Date().toISOString();
      }
      return NextResponse.json({ success: true, stats: session.stats });
    }

    if (action === 'execute_action') {
      const commandSpec =
        typeof actionId === 'string' && Object.prototype.hasOwnProperty.call(ALLOWLISTED_COMMANDS, actionId)
          ? ALLOWLISTED_COMMANDS[actionId]
          : undefined;
      if (!commandSpec) {
        return NextResponse.json({ error: 'Command is not in allowlisted repair database.' }, { status: 400 });
      }

      if (commandSpec.requiresAdmin && !userApproved) {
        return NextResponse.json(
          {
            error: 'Explicit user administrator approval required for this operation.',
            requiresAdmin: true,
            actionId,
            consequences: commandSpec.impact,
          },
          { status: 403 }
        );
      }

      // Execute allowlisted action with real Windows command simulation or companion response
      let outputText = '';
      let exitCode = 0;

      if (actionId === 'flush-dns') {
        outputText = 'Windows IP Configuration\n\nSuccessfully flushed the DNS Resolver Cache.';
        exitCode = 0;
      } else if (actionId === 'reset-winsock') {
        outputText = 'Successfully reset the Winsock Catalog.\nYou must restart the computer in order to complete the reset.\nResetting interface, OK!\nResetting neighbor, OK!\nResetting path, OK!\nRestart required.';
        exitCode = 0;
        session.stats.wlanStatus = 'Winsock reset queued (Reboot pending)';
      } else if (actionId === 'restart-wlan') {
        outputText = 'Service "WlanSvc" (WLAN AutoConfig) stopped.\nService "WlanSvc" started successfully.\nSignal reacquired: 100% Link Speed 866 Mbps.';
        exitCode = 0;
        session.stats.wlanStatus = 'Connected, Internet Access Verified';
        session.stats.internetReachable = true;
      } else if (actionId === 'restart-spooler') {
        outputText = 'Stopping Print Spooler service...\nCleared 2 pending corrupted .SHD/.SPL jobs from System32\\spool\\PRINTERS.\nStarting Print Spooler service... OK.\nService Spooler status: RUNNING.';
        exitCode = 0;
        session.stats.spoolerStatus = 'Running (0 queued jobs)';
      } else if (actionId === 'reset-update-services') {
        outputText = 'Stopping Windows Update services (wuauserv, bits, cryptsvc)...\nRenamed SoftwareDistribution to SoftwareDistribution.bak.\nStarting services...\nWindows Update Agent ready for sync.';
        exitCode = 0;
        session.stats.pendingUpdatesCount = 0;
      } else if (actionId === 'run-sfc-verify') {
        outputText = 'Beginning system scan. This process will take some time.\nBeginning verification phase of system scan.\nVerification 100% complete.\nWindows Resource Protection did not find any integrity violations.';
        exitCode = 0;
      } else if (actionId === 'clean-temp') {
        outputText = 'Purged 1,480 temporary files.\nFreed 3.84 GB disk space on Drive C:.';
        exitCode = 0;
        session.stats.diskFreeGb += 3.8;
      } else if (actionId === 'query-drivers-problem') {
        outputText = 'FriendlyName                InstanceId                         Status Problem\n------------                ----------                         ------ -------\nIntel Wireless-AC 9560 160M PCI\\VEN_8086&DEV_A370&SUBSYS... Error  43 (Device reports problem)';
        exitCode = 0;
      }

      outputText = `[DEMO — simulated output, nothing was run on your PC]\n${outputText}`;

      session.executionHistory.unshift({
        actionId,
        command: commandSpec.cmd,
        executedAt: new Date().toISOString(),
        output: outputText,
        exitCode,
      });

      return NextResponse.json({
        success: true,
        simulated: true,
        actionId,
        output: outputText,
        exitCode,
        updatedStats: session.stats,
      });
    }

    return NextResponse.json({ error: 'Unknown action specified.' }, { status: 400 });
  } catch (error: any) {
    console.error('Companion API error:', error);
    return NextResponse.json({ error: 'Companion request failed.' }, { status: 500 });
  }
}
