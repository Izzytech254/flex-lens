import { TroubleshootingScenario } from '@/types/technician';

// High-fidelity SVG render functions that produce authentic Windows dialog & terminal screenshots
function createWindowsErrorScreenSvg(
  title: string,
  appName: string,
  message: string,
  code: string,
  type: 'dialog' | 'bsod' | 'update' | 'cmd'
): string {
  if (type === 'bsod') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <rect width="800" height="500" fill="%230078D7"/>
      <text x="60" y="120" font-family="-apple-system, Segoe UI, sans-serif" font-size="70" fill="white">:(</text>
      <text x="60" y="200" font-family="-apple-system, Segoe UI, sans-serif" font-size="22" font-weight="400" fill="white">Your PC ran into a problem and needs to restart.</text>
      <text x="60" y="235" font-family="-apple-system, Segoe UI, sans-serif" font-size="16" fill="%23E0E0E0">We're just collecting some error info, and then we'll restart for you.</text>
      <text x="60" y="320" font-family="-apple-system, Segoe UI, sans-serif" font-size="14" fill="%23E0E0E0">For more information about this issue and possible fixes, visit https://windows.com/stopcode</text>
      <text x="60" y="360" font-family="-apple-system, Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="white">Stop code: ${code}</text>
      <text x="60" y="385" font-family="-apple-system, Segoe UI, sans-serif" font-size="14" fill="white">What failed: ${appName}</text>
    </svg>`;
  }

  if (type === 'cmd') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <rect width="800" height="500" fill="%230C0C0C"/>
      <rect x="0" y="0" width="800" height="35" fill="%231F1F1F"/>
      <text x="15" y="23" font-family="Consolas, monospace" font-size="13" fill="%23CCCCCC">Administrator: Windows PowerShell / Command Prompt</text>
      <circle cx="770" cy="18" r="6" fill="%23E81123"/>
      <circle cx="750" cy="18" r="6" fill="%23CCCCCC"/>
      <circle cx="730" cy="18" r="6" fill="%23CCCCCC"/>
      <text x="25" y="70" font-family="Consolas, monospace" font-size="15" fill="%23CCCCCC">PS C:\\WINDOWS\\system32&gt; ${appName}</text>
      <text x="25" y="105" font-family="Consolas, monospace" font-size="14" fill="%23E81123">${message}</text>
      <text x="25" y="135" font-family="Consolas, monospace" font-size="14" fill="%23E81123">Error Code: ${code}</text>
      <text x="25" y="180" font-family="Consolas, monospace" font-size="14" fill="%23CCCCCC">PS C:\\WINDOWS\\system32&gt; ping 1.1.1.1</text>
      <text x="25" y="210" font-family="Consolas, monospace" font-size="14" fill="%23F7A24D">Ping request could not find host 1.1.1.1. Please check the name and try again.</text>
      <text x="25" y="250" font-family="Consolas, monospace" font-size="14" fill="%23CCCCCC">PS C:\\WINDOWS\\system32&gt; _</text>
    </svg>`;
  }

  if (type === 'update') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <rect width="800" height="500" fill="%23202020"/>
      <rect x="0" y="0" width="800" height="40" fill="%232D2D2D"/>
      <text x="20" y="26" font-family="-apple-system, Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="white">Settings - Windows Update</text>
      <text x="50" y="90" font-family="-apple-system, Segoe UI, sans-serif" font-size="28" font-weight="600" fill="white">Windows Update</text>
      <rect x="50" y="120" width="700" height="110" rx="8" fill="%232D2D2D" stroke="%23E81123" stroke-width="2"/>
      <circle cx="85" cy="155" r="14" fill="%23E81123"/>
      <text x="80" y="161" font-family="sans-serif" font-size="18" font-weight="bold" fill="white">!</text>
      <text x="120" y="150" font-family="-apple-system, Segoe UI, sans-serif" font-size="16" font-weight="600" fill="white">There were some problems installing updates</text>
      <text x="120" y="175" font-family="-apple-system, Segoe UI, sans-serif" font-size="13" fill="%23AAAAAA">${message}</text>
      <text x="120" y="200" font-family="-apple-system, Segoe UI, sans-serif" font-size="13" font-weight="bold" fill="%23F7A24D">Download error - ${code}</text>
      <rect x="50" y="255" width="120" height="36" rx="4" fill="%230067C0"/>
      <text x="80" y="278" font-family="-apple-system, Segoe UI, sans-serif" font-size="13" font-weight="bold" fill="white">Retry</text>
    </svg>`;
  }

  // Standard Windows Error Modal Dialog
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <rect width="800" height="500" fill="%231E1E1E"/>
    <!-- Windows Desktop Background Mockup -->
    <rect x="0" y="465" width="800" height="35" fill="%23111111"/>
    <circle cx="400" cy="482" r="7" fill="%230078D7"/>
    <circle cx="420" cy="482" r="7" fill="%23E0E0E0"/>
    <circle cx="440" cy="482" r="7" fill="%23E0E0E0"/>
    <text x="730" y="488" font-family="-apple-system, Segoe UI" font-size="11" fill="white">10:42 AM</text>
    <!-- Dialog Window -->
    <rect x="150" y="110" width="500" height="230" rx="8" fill="%232B2B2B" stroke="%23444444" stroke-width="1.5" filter="drop-shadow(0 15px 25px rgba(0,0,0,0.8))"/>
    <rect x="150" y="110" width="500" height="34" rx="8 8 0 0" fill="%23383838"/>
    <text x="175" y="132" font-family="-apple-system, Segoe UI, sans-serif" font-size="13" font-weight="600" fill="white">${title}</text>
    <rect x="620" y="118" width="18" height="18" fill="transparent"/>
    <text x="625" y="132" font-family="sans-serif" font-size="14" fill="%23AAAAAA">✕</text>
    <!-- Error Icon -->
    <circle cx="195" cy="190" r="18" fill="%23E81123"/>
    <text x="189" y="197" font-family="sans-serif" font-size="22" font-weight="bold" fill="white">✕</text>
    <!-- Text body -->
    <text x="235" y="180" font-family="-apple-system, Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="white">${appName}</text>
    <text x="235" y="205" font-family="-apple-system, Segoe UI, sans-serif" font-size="13" fill="%23CCCCCC">${message}</text>
    <text x="235" y="235" font-family="-apple-system, Segoe UI, sans-serif" font-size="13" font-weight="bold" fill="%23F7A24D">Error code: ${code}</text>
    <!-- Buttons -->
    <rect x="520" y="285" width="105" height="32" rx="4" fill="%233F3F3F" stroke="%23555555"/>
    <text x="560" y="306" font-family="-apple-system, Segoe UI, sans-serif" font-size="13" fill="white">OK</text>
    <rect x="400" y="285" width="105" height="32" rx="4" fill="%232D2D2D" stroke="%23555555"/>
    <text x="430" y="306" font-family="-apple-system, Segoe UI, sans-serif" font-size="13" fill="%23CCCCCC">Cancel</text>
  </svg>`;
}

export const REAL_WORLD_SCENARIOS: TroubleshootingScenario[] = [
  {
    id: 'scenario-wifi',
    title: '1. Wi-Fi Cannot Connect',
    category: 'Network & Wireless',
    shortDescription: 'Computer reports "Can\'t connect to this network" with error 0x800704cf and WLAN service crash.',
    errorBadge: 'Error 0x800704cf',
    sampleUserPrompt: 'My laptop shows Wi-Fi is turned on, but whenever I try to connect to my home network it instantly says "Can\'t connect to this network" and shows error code 0x800704cf.',
    expectedRootCause: 'WLAN AutoConfig stack corruption, stale network profile cache, or Winsock LSP conflict.',
    imageUrl: createWindowsErrorScreenSvg(
      'Network Connections',
      'Wi-Fi (Intel Wi-Fi 6 AX201)',
      'Can\'t connect to this network. The network location cannot be reached.',
      '0x800704cf',
      'dialog'
    ),
  },
  {
    id: 'scenario-app-crash',
    title: '2. Application Fails to Launch',
    category: 'Software & Runtime',
    shortDescription: 'Application crashes immediately with 0xc0000005 Access Violation or missing MSVCP140.dll.',
    errorBadge: '0xc0000005',
    sampleUserPrompt: 'Whenever I click to open my accounting software, nothing happens for 2 seconds and then this error box appears saying the application was unable to start correctly.',
    expectedRootCause: 'Memory Access Violation or corrupted Microsoft Visual C++ Redistributable 2015-2022 runtime libraries.',
    imageUrl: createWindowsErrorScreenSvg(
      'QuickBooksDesktop.exe - Application Error',
      'QuickBooksDesktop.exe',
      'The application was unable to start correctly (0xc0000005). Click OK to close the application.',
      '0xc0000005',
      'dialog'
    ),
  },
  {
    id: 'scenario-printer',
    title: '3. Printer Cannot Be Detected',
    category: 'Peripherals & Hardware',
    shortDescription: 'Windows reports "The local print spooler service is not running" with RPC error 0x000006ba.',
    errorBadge: 'RPC 0x000006ba',
    sampleUserPrompt: 'I cannot print anything. When I go to Devices and Printers, all my printers have disappeared and Windows says the Print Spooler service is stopped.',
    expectedRootCause: 'Print Spooler subsystem crashed due to corrupted spool files in System32\\spool\\PRINTERS.',
    imageUrl: createWindowsErrorScreenSvg(
      'Printers & Scanners',
      'Spooler SubSystem App',
      'Operation could not be completed. The print spooler service is not running.',
      '0x000006ba',
      'dialog'
    ),
  },
  {
    id: 'scenario-windows-update',
    title: '4. Windows Update Failure',
    category: 'Operating System',
    shortDescription: 'Cumulative security update fails during installation with error code 0x80070002 or 0x80248007.',
    errorBadge: '0x80070002',
    sampleUserPrompt: 'Windows Update has been failing to install the 2026 Security Update for 3 days. It downloads to 100% and then fails with error 0x80070002.',
    expectedRootCause: 'Corrupted temporary cache files in C:\\Windows\\SoftwareDistribution\\Download or Catroot2 folder.',
    imageUrl: createWindowsErrorScreenSvg(
      'Windows Update',
      '2026-11 Cumulative Update for Windows 11 Version 23H2 (KB5044284)',
      'Some update files are missing or have problems. We\'ll try to download the update again later.',
      '0x80070002',
      'update'
    ),
  },
  {
    id: 'scenario-storage',
    title: '5. Insufficient Disk Storage',
    category: 'Storage & Drives',
    shortDescription: 'System Drive (C:) critically red-lined at 98% capacity with under 1.2 GB remaining.',
    errorBadge: 'Low Disk Space (98%)',
    sampleUserPrompt: 'My computer is freezing and Windows keeps popping up Low Disk Space warnings on C: drive. I don\'t know what is consuming all 256 GB.',
    expectedRootCause: 'Bloated C:\\Windows\\Temp, old Windows.old rollback files, or oversized WinSXS component store.',
    imageUrl: createWindowsErrorScreenSvg(
      'Low Disk Space',
      'Local Disk (C:)',
      'You are running very low on disk space on Local Disk (C:). 1.18 GB free of 237 GB. System performance is severely degraded.',
      'STATUS_DISK_FULL_WARN',
      'dialog'
    ),
  },
  {
    id: 'scenario-install-fail',
    title: '6. Software Installation Fails',
    category: 'Windows Installer',
    shortDescription: 'MSI installer rolls back with "Fatal error during installation" (Error 1603).',
    errorBadge: 'MSI Error 1603',
    sampleUserPrompt: 'I am trying to install Visual Studio Code, but halfway through the installer suddenly rolls back and displays Fatal error during installation (1603).',
    expectedRootCause: 'Windows Installer service permissions issue, encrypted installation folder, or pending reboot lock.',
    imageUrl: createWindowsErrorScreenSvg(
      'Setup - Installation Wizard',
      'VSCodeSetup-x64-1.95.exe',
      'Installation ended prematurely because of an error. A fatal error occurred during installation.',
      '1603',
      'dialog'
    ),
  },
  {
    id: 'scenario-driver-code43',
    title: '7. Device Driver Problem (Code 43)',
    category: 'Drivers & Devices',
    shortDescription: 'GPU or Wi-Fi adapter has yellow warning triangle in Device Manager with Code 43 or Code 10.',
    errorBadge: 'Device Code 43',
    sampleUserPrompt: 'My second monitor stopped working and Device Manager shows a yellow exclamation mark next to my NVIDIA graphics card saying Code 43.',
    expectedRootCause: 'Corrupted display driver binaries, PCI-e power state hang, or failed driver firmware negotiation.',
    imageUrl: createWindowsErrorScreenSvg(
      'Device Properties - NVIDIA GeForce RTX 3070',
      'PCI Express Graphics Device',
      'Windows has stopped this device because it has reported problems. (Code 43)',
      'CM_PROB_FAILED_POST_START (Code 43)',
      'dialog'
    ),
  },
  {
    id: 'scenario-network-dns',
    title: '8. Network DNS & DHCP Failure',
    category: 'Networking Stack',
    shortDescription: 'Browser shows "DNS_PROBE_FINISHED_BAD_CONFIG" and ping reports host unreachable.',
    errorBadge: 'DNS_PROBE_BAD_CONFIG',
    sampleUserPrompt: 'I have Wi-Fi signal, but no web page will open. Chrome says DNS probe finished bad config and ping returns could not find host.',
    expectedRootCause: 'Corrupted DNS Client resolver cache, mismatched static DNS IP, or router DNS forwarder crash.',
    imageUrl: createWindowsErrorScreenSvg(
      'Command Prompt',
      'ping google.com',
      'Ping request could not find host google.com. Please check the name and try again.',
      'DNS_PROBE_FINISHED_BAD_CONFIG',
      'cmd'
    ),
  },
];
