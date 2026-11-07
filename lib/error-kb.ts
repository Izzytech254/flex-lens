// Built-in library of common computer errors, used by the offline (no AI, no API key) diagnosis.
// Each entry is matched against text read from the screen (OCR) and produces the same shape of
// analysis the AI returns, so the scanner can guide the user step by step with voice.

export type KbOS = 'Windows' | 'macOS' | 'Linux';

export interface KbStep {
  title: string;
  description: string;
  /** Voice-style version: short beats, one action each */
  spoken: string;
  command?: string;
  actionType?: 'gui_action' | 'powershell_cmd' | 'cmd_command' | 'terminal_cmd' | 'reboot_check';
  admin?: boolean;
  expected?: string;
  caution?: string;
}

export interface KbEntry {
  id: string;
  os: KbOS;
  /** Any match identifies this error. Tested against the OCR text (case-insensitive). */
  patterns: RegExp[];
  title: string;
  code?: string;
  component: string;
  /** Spoken explanation in friend terms: simple cause → effect */
  explanation: string;
  causes: Array<{ title: string; probability: 'HIGH' | 'MEDIUM' | 'LOW'; why: string }>;
  steps: KbStep[];
}

export const ERROR_KB: KbEntry[] = [
  // ------------------------------------------------------------------ Windows
  {
    id: 'win-wifi-0x800704cf',
    os: 'Windows',
    patterns: [/0x800704cf/i, /can'?t connect to this network/i, /network location cannot be reached/i],
    title: "Wi-Fi can't connect (0x800704cf)",
    code: '0x800704cf',
    component: 'Wi-Fi / network adapter',
    explanation:
      "Your computer can't reach the network. ... Usually the Wi-Fi connection or the network settings got stuck, so nothing can get through.",
    causes: [
      { title: 'A stuck Wi-Fi connection', probability: 'HIGH', why: 'Toggling Wi-Fi usually clears it.' },
      { title: 'Corrupted network settings', probability: 'MEDIUM', why: 'Resetting the network stack fixes this.' },
      { title: 'Outdated or faulty Wi-Fi driver', probability: 'LOW', why: 'Shows up after updates or hardware changes.' },
    ],
    steps: [
      {
        title: 'Turn Wi-Fi off and on',
        description: 'Click the Wi-Fi icon on the taskbar, turn Wi-Fi off, wait 10 seconds, then turn it back on and reconnect.',
        spoken: "Let's click the Wi-Fi icon on your taskbar. ... Turn Wi-Fi off. ... Wait about ten seconds. ... Now turn it back on and pick your network.",
        expected: 'Your network shows "Connected".',
      },
      {
        title: 'Forget the network and reconnect',
        description: 'Open Settings → Network & internet → Wi-Fi → Manage known networks, select your network, click Forget, then reconnect with the password.',
        spoken: "Open Settings, then Network and internet. ... Go to Wi-Fi, then Manage known networks. ... Pick your network and click Forget. ... Now connect again with your Wi-Fi password.",
        expected: 'You can connect after entering the password.',
      },
      {
        title: 'Reset the network settings',
        description: 'Open Terminal (Admin) or Command Prompt (Admin), run the command below, then restart the computer.',
        spoken: "Right-click the Start button and open Terminal as administrator. ... Run the command on your screen. ... Then restart the computer.",
        command: 'netsh winsock reset && netsh int ip reset',
        actionType: 'cmd_command',
        admin: true,
        expected: 'Both commands report "OK", and Wi-Fi works after the restart.',
        caution: 'This resets network settings, so any VPN or custom network setup may need to be set up again.',
      },
    ],
  },
  {
    id: 'win-spooler-0x000006ba',
    os: 'Windows',
    patterns: [/0x000006ba/i, /print spooler/i, /spooler service is not running/i, /operation could not be completed.*print/i],
    title: 'Printer error: Print Spooler not running (0x000006ba)',
    code: '0x000006ba',
    component: 'Print Spooler service',
    explanation:
      "Windows can't talk to your printer. ... The Print Spooler, the background service that handles printing, has stopped, often because of a stuck print job.",
    causes: [
      { title: 'Print Spooler service stopped or crashed', probability: 'HIGH', why: 'The error says the spooler is not running.' },
      { title: 'A stuck print job', probability: 'MEDIUM', why: 'A corrupted job can crash the spooler repeatedly.' },
    ],
    steps: [
      {
        title: 'Restart the Print Spooler',
        description: 'Open Terminal (Admin) and run the command below to restart the spooler service.',
        spoken: "Right-click the Start button and open Terminal as administrator. ... Run the command on your screen. ... It restarts the printing service.",
        command: 'Restart-Service -Name Spooler -Force',
        actionType: 'powershell_cmd',
        admin: true,
        expected: 'No error appears, and your printer shows up again.',
      },
      {
        title: 'Clear stuck print jobs',
        description: 'If it fails again, stop the spooler, delete the stuck jobs, then start it again with the command below.',
        spoken: "If it's still failing, let's clear out the stuck print jobs. ... Run the command on your screen in the admin Terminal.",
        command: 'Stop-Service Spooler -Force; Remove-Item "$env:SystemRoot\\System32\\spool\\PRINTERS\\*" -Force; Start-Service Spooler',
        actionType: 'powershell_cmd',
        admin: true,
        expected: 'The print queue is empty and you can print a test page.',
        caution: 'This deletes everything waiting to print. You will need to print those documents again.',
      },
      {
        title: 'Print a test page',
        description: 'Open Settings → Bluetooth & devices → Printers & scanners, select your printer and choose "Print test page".',
        spoken: "Open Settings, then Bluetooth and devices, then Printers and scanners. ... Pick your printer. ... Choose Print test page.",
        expected: 'The test page prints.',
      },
    ],
  },
  {
    id: 'win-update-0x80070002',
    os: 'Windows',
    patterns: [/0x80070002/i, /0x80248007/i, /some update files are missing/i, /problems installing updates/i],
    title: 'Windows Update failed (0x80070002)',
    code: '0x80070002',
    component: 'Windows Update',
    explanation:
      "Windows Update couldn't install. ... Some downloaded update files are missing or damaged, so Windows can't finish.",
    causes: [
      { title: 'Damaged files in the update cache', probability: 'HIGH', why: 'The error says update files are missing.' },
      { title: 'Wrong date and time, or low disk space', probability: 'MEDIUM', why: 'Both can make updates fail.' },
    ],
    steps: [
      {
        title: 'Run the Windows Update troubleshooter',
        description: 'Open Settings → System → Troubleshoot → Other troubleshooters, and run Windows Update.',
        spoken: "Open Settings, then System, then Troubleshoot. ... Choose Other troubleshooters. ... Run the one called Windows Update.",
        expected: 'The troubleshooter finishes and reports what it fixed.',
      },
      {
        title: 'Reset the update cache',
        description: 'Open Command Prompt (Admin) and run the command below. It stops the update services, renames the cache folder, and restarts them.',
        spoken: "Now let's clear the update cache. ... Open Command Prompt as administrator. ... Run the command on your screen.",
        command: 'net stop wuauserv && net stop bits && ren %windir%\\SoftwareDistribution SoftwareDistribution.old && net start wuauserv && net start bits',
        actionType: 'cmd_command',
        admin: true,
        expected: 'Each service reports it stopped and started successfully.',
      },
      {
        title: 'Try the update again',
        description: 'Go to Settings → Windows Update and click "Check for updates".',
        spoken: "Go back to Settings, then Windows Update. ... Click Check for updates.",
        expected: 'The update downloads and installs.',
      },
    ],
  },
  {
    id: 'win-app-0xc0000005',
    os: 'Windows',
    patterns: [/0xc0000005/i, /unable to start correctly/i, /msvcp140|vcruntime140/i],
    title: "App can't start (0xc0000005)",
    code: '0xc0000005',
    component: 'Application / Visual C++ runtime',
    explanation:
      "The app crashed as it started. ... Usually a shared Windows component it depends on is damaged, or the app itself is.",
    causes: [
      { title: 'Damaged Visual C++ runtime', probability: 'HIGH', why: 'Many apps depend on it.' },
      { title: 'Damaged app installation', probability: 'MEDIUM', why: 'Reinstalling usually fixes it.' },
      { title: 'Damaged Windows system files', probability: 'LOW', why: 'System file check can repair them.' },
    ],
    steps: [
      {
        title: 'Restart and try again',
        description: 'Restart the computer, then open the app again.',
        spoken: "First, let's restart the computer. ... Then try opening the app again.",
        actionType: 'reboot_check',
        expected: 'The app opens normally.',
      },
      {
        title: 'Repair the Visual C++ runtime',
        description: 'Open Settings → Apps → Installed apps, find "Microsoft Visual C++ 2015-2022 Redistributable", click ••• → Modify → Repair. Do this for each one listed.',
        spoken: "Open Settings, then Apps, then Installed apps. ... Find Microsoft Visual C plus plus Redistributable. ... Click the three dots, then Modify, then Repair.",
        expected: 'The repair finishes successfully.',
      },
      {
        title: 'Reinstall the app',
        description: 'Uninstall the app from Installed apps, download it again from the official website, and install it.',
        spoken: "If it still won't open, uninstall the app. ... Download it again from the official website. ... Then install it.",
        expected: 'The freshly installed app opens.',
      },
    ],
  },
  {
    id: 'win-msi-1603',
    os: 'Windows',
    patterns: [/fatal error (occurred )?during installation/i, /error 1603/i, /\b1603\b.*install|install.*\b1603\b/i, /installation ended prematurely/i],
    title: 'Installer failed (error 1603)',
    code: '1603',
    component: 'Windows Installer',
    explanation:
      "The installer hit a problem and rolled back. ... Usually another install is still pending, or it couldn't write where it needed to.",
    causes: [
      { title: 'A pending restart or another install running', probability: 'HIGH', why: 'Windows Installer can only do one job at a time.' },
      { title: 'Not enough permissions or disk space', probability: 'MEDIUM', why: 'The installer must write to protected folders.' },
    ],
    steps: [
      {
        title: 'Restart the computer',
        description: 'Restart to finish any pending installs or updates.',
        spoken: "Let's restart the computer first. ... That finishes anything that was still installing.",
        actionType: 'reboot_check',
        expected: 'The computer restarts normally.',
      },
      {
        title: 'Run the installer as administrator',
        description: 'Right-click the installer file and choose "Run as administrator". Make sure you have at least a few GB of free disk space.',
        spoken: "Find the installer file. ... Right-click it and choose Run as administrator.",
        admin: true,
        expected: 'The installation completes.',
      },
    ],
  },
  {
    id: 'win-code43',
    os: 'Windows',
    patterns: [/code 43/i, /windows has stopped this device/i],
    title: 'Device stopped by Windows (Code 43)',
    code: 'Code 43',
    component: 'Device driver',
    explanation:
      "Windows switched off a device because it reported a problem. ... Usually it's the driver, but sometimes the hardware itself.",
    causes: [
      { title: 'Driver problem', probability: 'HIGH', why: 'Updating or reinstalling the driver often fixes Code 43.' },
      { title: 'Hardware or connection fault', probability: 'MEDIUM', why: 'Loose cables or failing devices cause it too.' },
    ],
    steps: [
      {
        title: 'Shut down fully, then start again',
        description: 'Click Start → Power → Shut down, wait 30 seconds, then turn the computer back on.',
        spoken: "Let's do a full shut down. ... Click Start, then Power, then Shut down. ... Wait thirty seconds, then turn it back on.",
        actionType: 'reboot_check',
        expected: 'The device works after starting up.',
      },
      {
        title: 'Disable and re-enable the device',
        description: 'Right-click Start → Device Manager, right-click the device with the warning icon, choose Disable device, then right-click again and choose Enable device.',
        spoken: "Right-click the Start button and open Device Manager. ... Right-click the device with the yellow warning. ... Disable it. ... Then enable it again.",
        expected: 'The yellow warning disappears.',
      },
      {
        title: 'Update the driver',
        description: "In Device Manager, right-click the device → Update driver → Search automatically. Or download the latest driver from the manufacturer's website.",
        spoken: "Right-click the device again and choose Update driver. ... Pick Search automatically.",
        expected: 'Windows installs a driver and the device works.',
        caution: "If it still fails on another computer or port, the hardware may be faulty. A repair shop can check it.",
      },
    ],
  },
  {
    id: 'win-bsod',
    os: 'Windows',
    patterns: [
      /your (pc|device) ran into a problem/i,
      /stop code/i,
      /CRITICAL_PROCESS_DIED|IRQL_NOT_LESS_OR_EQUAL|INACCESSIBLE_BOOT_DEVICE|MEMORY_MANAGEMENT|PAGE_FAULT_IN_NONPAGED_AREA|SYSTEM_SERVICE_EXCEPTION|KMODE_EXCEPTION/i,
    ],
    title: 'Blue screen (Windows stop error)',
    component: 'Windows system / drivers',
    explanation:
      "Windows hit a serious error and had to restart. ... It's usually a bad driver or damaged system files, and once in a while, hardware.",
    causes: [
      { title: 'Faulty or outdated driver', probability: 'HIGH', why: 'The most common cause of stop errors.' },
      { title: 'Damaged system files', probability: 'MEDIUM', why: 'System checks can repair them.' },
      { title: 'Memory or disk problem', probability: 'LOW', why: 'Shows up as repeated, random blue screens.' },
    ],
    steps: [
      {
        title: 'Note the stop code and restart',
        description: 'Write down the stop code shown on screen, then let the computer restart.',
        spoken: "First, jot down the stop code on the screen. ... Then let the computer restart.",
        actionType: 'reboot_check',
        expected: 'Windows starts normally.',
      },
      {
        title: 'Install all updates',
        description: 'Open Settings → Windows Update, install all updates including optional driver updates, then restart.',
        spoken: "Open Settings, then Windows Update. ... Install everything, including the optional driver updates. ... Then restart.",
        expected: 'Updates install without errors.',
      },
      {
        title: 'Repair system files',
        description: 'Open Terminal (Admin) and run the command below. It can take 15–30 minutes.',
        spoken: "Now let's repair the system files. ... Open Terminal as administrator. ... Run the command on your screen. ... It takes a while, so be patient.",
        command: 'DISM /Online /Cleanup-Image /RestoreHealth; sfc /scannow',
        actionType: 'powershell_cmd',
        admin: true,
        expected: 'It reports that it repaired files, or found no problems.',
        caution: "Back up important files first. If the blue screens keep happening, a technician should check the memory and disk.",
      },
    ],
  },
  {
    id: 'dns-failure',
    os: 'Windows',
    patterns: [/DNS_PROBE_\w+/i, /could not find host/i, /server'?s? (IP|DNS) address could not be found/i, /DNS server isn'?t responding/i],
    title: 'Websites won’t load (DNS error)',
    component: 'DNS (internet address lookup)',
    explanation:
      "You're online, but your computer can't look up website addresses. ... Think of DNS as the internet's phone book, and right now the lookup is failing.",
    causes: [
      { title: 'Stale DNS cache', probability: 'HIGH', why: 'Flushing it usually fixes lookups.' },
      { title: 'Router DNS problem', probability: 'MEDIUM', why: 'Restarting the router or switching DNS servers helps.' },
    ],
    steps: [
      {
        title: 'Restart your router',
        description: 'Unplug the router for 30 seconds, plug it back in, and wait 2 minutes.',
        spoken: "Let's restart your router. ... Unplug it for thirty seconds. ... Plug it back in and wait a couple of minutes.",
        expected: 'The router lights settle and websites start loading.',
      },
      {
        title: 'Flush the DNS cache',
        description: 'Open Command Prompt and run the command below.',
        spoken: "Open Command Prompt. ... Run the command on your screen. ... It clears out the old addresses.",
        command: 'ipconfig /flushdns',
        actionType: 'cmd_command',
        expected: '"Successfully flushed the DNS Resolver Cache."',
      },
      {
        title: 'Use a public DNS server',
        description: 'Settings → Network & internet → your connection → Hardware properties → DNS server assignment → Edit → Manual, and set IPv4 DNS to 1.1.1.1 and 8.8.8.8.',
        spoken: "If it's still failing, let's switch to a public DNS. ... Open your connection's settings. ... Set the DNS manually to one dot one dot one dot one.",
        expected: 'Websites load normally.',
      },
    ],
  },
  {
    id: 'win-low-disk',
    os: 'Windows',
    patterns: [/low disk space/i, /running (very )?low on disk/i, /not enough (disk )?space/i],
    title: 'Low disk space',
    component: 'Storage',
    explanation:
      "Your main drive is almost full. ... When there's no room left, Windows slows down and updates fail.",
    causes: [
      { title: 'Temporary and old update files', probability: 'HIGH', why: 'They pile up over time.' },
      { title: 'Large personal files or unused apps', probability: 'MEDIUM', why: 'Videos and games take a lot of space.' },
    ],
    steps: [
      {
        title: 'Empty the Recycle Bin',
        description: 'Right-click the Recycle Bin on the desktop and choose Empty Recycle Bin.',
        spoken: "Right-click the Recycle Bin on your desktop. ... Choose Empty Recycle Bin.",
        expected: 'Free space goes up.',
      },
      {
        title: 'Clean up temporary files',
        description: 'Open Settings → System → Storage → Temporary files, select the items you no longer need, and click Remove files.',
        spoken: "Open Settings, then System, then Storage. ... Click Temporary files. ... Select what you don't need and remove them.",
        expected: 'Several GB are freed.',
        caution: 'Check the Downloads folder box only if you have nothing in there you want to keep.',
      },
      {
        title: 'Remove apps you no longer use',
        description: 'Open Settings → Apps → Installed apps, sort by size, and uninstall apps you no longer need.',
        spoken: "Open Settings, then Apps, then Installed apps. ... Sort by size. ... Uninstall anything big you don't use.",
        expected: 'The drive has comfortable free space.',
      },
    ],
  },

  // ------------------------------------------------------------------ Linux
  {
    id: 'linux-apt-network',
    os: 'Linux',
    patterns: [/temporary failure resolving/i, /failed to fetch/i, /could not resolve/i, /network is unreachable/i],
    title: "Linux can't reach the package servers",
    component: 'Network / DNS',
    explanation:
      "Your system couldn't reach the update servers. ... Usually the internet connection or the DNS lookup isn't working.",
    causes: [
      { title: 'No internet connection', probability: 'HIGH', why: 'apt needs to download from the internet.' },
      { title: 'DNS not resolving names', probability: 'MEDIUM', why: '"Temporary failure resolving" means a DNS lookup failed.' },
    ],
    steps: [
      {
        title: 'Check the internet connection',
        description: 'Run the command below. If you get replies, the internet works.',
        spoken: "Let's check you're online. ... Open a terminal and run the command on your screen. ... Tell me if you get replies.",
        command: 'ping -c 3 8.8.8.8',
        actionType: 'terminal_cmd',
        expected: '3 packets transmitted, 3 received.',
      },
      {
        title: 'Restart networking',
        description: 'Restart NetworkManager with the command below.',
        spoken: "Now let's restart the network service. ... Run the command on your screen. ... It needs your password.",
        command: 'sudo systemctl restart NetworkManager',
        actionType: 'terminal_cmd',
        admin: true,
        expected: 'Your network reconnects within a few seconds.',
      },
      {
        title: 'Try the update again',
        description: 'Run apt update again.',
        spoken: "Ok, try the update again with the command on your screen.",
        command: 'sudo apt update',
        actionType: 'terminal_cmd',
        admin: true,
        expected: 'Package lists download without errors.',
      },
    ],
  },
  {
    id: 'linux-apt-lock',
    os: 'Linux',
    patterns: [/could not get lock/i, /dpkg was interrupted/i, /unable to acquire the dpkg frontend lock/i],
    title: 'Package manager is locked',
    component: 'apt / dpkg',
    explanation:
      "Another update is already running, or an earlier one was interrupted. ... Only one install can run at a time, so apt is waiting.",
    causes: [
      { title: 'Automatic updates are running', probability: 'HIGH', why: 'Ubuntu updates in the background.' },
      { title: 'A previous install was interrupted', probability: 'MEDIUM', why: 'dpkg needs to finish configuring.' },
    ],
    steps: [
      {
        title: 'Wait for other updates to finish',
        description: 'Close Software Updater or any other installer and wait a few minutes. Check for running apt processes with the command below.',
        spoken: "First, give it a few minutes in case updates are running. ... You can check with the command on your screen.",
        command: 'ps aux | grep -i -E "apt|dpkg" | grep -v grep',
        actionType: 'terminal_cmd',
        expected: 'No apt or dpkg processes are listed.',
      },
      {
        title: 'Finish an interrupted install',
        description: 'Run the command below to complete any half-finished package setup.',
        spoken: "Now let's finish anything that got interrupted. ... Run the command on your screen.",
        command: 'sudo dpkg --configure -a',
        actionType: 'terminal_cmd',
        admin: true,
        expected: 'It finishes without errors.',
        caution: "Don't delete lock files while an update is still running. That can break your system.",
      },
    ],
  },
  {
    id: 'linux-no-space',
    os: 'Linux',
    patterns: [/no space left on device/i],
    title: 'Linux disk is full',
    component: 'Storage',
    explanation: "The disk is full, so programs can't save anything. ... Let's find and clear the big stuff.",
    causes: [
      { title: 'Old packages and logs', probability: 'HIGH', why: 'They build up over time.' },
      { title: 'Large personal files', probability: 'MEDIUM', why: 'Downloads and videos fill disks fast.' },
    ],
    steps: [
      {
        title: 'See which disk is full',
        description: 'Run the command below and look for a disk at or near 100%.',
        spoken: "Let's see what's full. ... Run the command on your screen and look for anything near one hundred percent.",
        command: 'df -h',
        actionType: 'terminal_cmd',
        expected: 'A list of disks with how full each one is.',
      },
      {
        title: 'Clean old packages and logs',
        description: 'Remove cached packages, unused dependencies, and old logs.',
        spoken: "Now let's clear out old packages and logs. ... Run the command on your screen.",
        command: 'sudo apt clean && sudo apt autoremove -y && sudo journalctl --vacuum-size=200M',
        actionType: 'terminal_cmd',
        admin: true,
        expected: 'Free space goes up when you run df -h again.',
      },
    ],
  },
  {
    id: 'linux-segfault',
    os: 'Linux',
    patterns: [/segmentation fault/i, /core dumped/i],
    title: 'Program crashed (segmentation fault)',
    component: 'Application',
    explanation: "The program crashed. ... It tried to use memory it wasn't allowed to, usually because of a bug or a broken install.",
    causes: [
      { title: 'Bug or broken install of the program', probability: 'HIGH', why: 'Updating or reinstalling usually helps.' },
      { title: 'Faulty memory', probability: 'LOW', why: 'Only if many programs crash randomly.' },
    ],
    steps: [
      {
        title: 'Update your system',
        description: 'Install the latest fixes for your programs.',
        spoken: "Let's get the latest fixes. ... Run the command on your screen.",
        command: 'sudo apt update && sudo apt upgrade -y',
        actionType: 'terminal_cmd',
        admin: true,
        expected: 'Updates install without errors.',
      },
      {
        title: 'Check the crash details',
        description: 'Look at the last kernel messages for clues about what crashed.',
        spoken: "Now let's look for clues. ... Run the command on your screen and read the last few lines.",
        command: 'sudo dmesg | tail -n 20',
        actionType: 'terminal_cmd',
        admin: true,
        expected: 'Lines mentioning the crashed program.',
      },
    ],
  },
  {
    id: 'linux-permission',
    os: 'Linux',
    patterns: [/permission denied/i],
    title: 'Permission denied',
    component: 'File permissions',
    explanation: "Your user isn't allowed to do that. ... The file isn't executable, or it needs admin rights.",
    causes: [
      { title: 'Script not marked as executable', probability: 'HIGH', why: 'Common with downloaded scripts.' },
      { title: 'Needs admin (sudo) rights', probability: 'MEDIUM', why: 'System files are protected.' },
    ],
    steps: [
      {
        title: 'Make the script executable',
        description: 'If you were running a script, mark it executable (replace the name with yours).',
        spoken: "If you were running a script, let's allow it to run. ... Use the command on your screen with your script's name.",
        command: 'chmod +x ./your-script.sh',
        actionType: 'terminal_cmd',
        expected: 'The script runs when you try again.',
        caution: 'Only do this for scripts you trust.',
      },
    ],
  },
  {
    id: 'linux-kernel-panic',
    os: 'Linux',
    patterns: [/kernel panic/i, /not syncing/i],
    title: 'Linux kernel panic',
    component: 'Linux kernel',
    explanation:
      "The system hit a fatal error and stopped. ... Often a recent kernel update or driver, sometimes a failing disk or memory.",
    causes: [
      { title: 'Problem with a new kernel or driver', probability: 'HIGH', why: 'Booting an older kernel usually works.' },
      { title: 'Disk or memory fault', probability: 'MEDIUM', why: 'Hardware errors can trigger panics.' },
    ],
    steps: [
      {
        title: 'Restart the computer',
        description: 'Hold the power button to turn it off, then turn it on again.',
        spoken: "Let's restart. ... Hold the power button until it turns off. ... Then turn it back on.",
        actionType: 'reboot_check',
        expected: 'It boots normally.',
      },
      {
        title: 'Boot an older kernel',
        description: 'If it panics again, choose "Advanced options" in the GRUB menu at startup and pick the previous kernel version.',
        spoken: "If it happens again, watch for the boot menu. ... Choose Advanced options. ... Then pick the older kernel.",
        expected: 'The system boots with the older kernel.',
        caution: "If it keeps panicking, back up your data from a live USB and have the disk and memory tested.",
      },
    ],
  },

  // ------------------------------------------------------------------ macOS
  {
    id: 'mac-error-36',
    os: 'macOS',
    patterns: [/error code -?36\b/i, /operation can.?t be completed because an unexpected error occurred/i],
    title: "Can't copy files (error code -36)",
    code: '-36',
    component: 'Finder / file system',
    explanation:
      "Finder couldn't read or write part of a file. ... It often happens with external drives and hidden helper files.",
    causes: [
      { title: 'Hidden "._" helper files on an external drive', probability: 'HIGH', why: 'Common on drives used with Windows.' },
      { title: 'Disk errors', probability: 'MEDIUM', why: 'First Aid can repair them.' },
    ],
    steps: [
      {
        title: 'Clean hidden helper files',
        description: 'Open Terminal and run the command below, replacing the drive name with yours.',
        spoken: "Open Terminal. ... Run the command on your screen, with your drive's name. ... It cleans up hidden helper files.",
        command: 'dot_clean "/Volumes/YourDriveName"',
        actionType: 'terminal_cmd',
        expected: 'The command finishes with no output.',
      },
      {
        title: 'Run Disk Utility First Aid',
        description: 'Open Disk Utility, select the drive, and click First Aid → Run.',
        spoken: "Now open Disk Utility. ... Select the drive. ... Click First Aid, then Run.",
        expected: 'First Aid reports the drive is OK or repaired.',
      },
      {
        title: 'Copy again',
        description: 'Try copying the files again, in smaller batches if needed.',
        spoken: "Ok, try copying again. ... If it's a lot, do it in smaller batches.",
        expected: 'The files copy without the error.',
      },
    ],
  },
  {
    id: 'mac-kernel-panic',
    os: 'macOS',
    patterns: [/restarted because of a problem/i, /you need to restart your computer/i],
    title: 'Mac restarted because of a problem',
    component: 'macOS kernel',
    explanation:
      "Your Mac hit a serious error and restarted. ... Usually software, an accessory, or a driver, and rarely hardware.",
    causes: [
      { title: 'Outdated macOS or app', probability: 'HIGH', why: 'Updates fix most panics.' },
      { title: 'Faulty accessory', probability: 'MEDIUM', why: 'Disconnecting accessories helps find it.' },
    ],
    steps: [
      {
        title: 'Update macOS',
        description: 'Open System Settings → General → Software Update and install any updates.',
        spoken: "Open System Settings, then General, then Software Update. ... Install anything available.",
        expected: 'Your Mac is up to date.',
      },
      {
        title: 'Disconnect accessories',
        description: 'Unplug everything except keyboard, mouse and display, then use the Mac normally.',
        spoken: "Now unplug everything except your keyboard, mouse and display. ... Then use the Mac for a while.",
        expected: 'No more unexpected restarts.',
        caution: "If it keeps restarting, run Apple Diagnostics or visit an Apple Store or authorised repair shop.",
      },
    ],
  },
  {
    id: 'mac-app-quit',
    os: 'macOS',
    patterns: [/quit unexpectedly/i],
    title: 'App quit unexpectedly',
    component: 'Application',
    explanation: "The app crashed. ... Usually a bug that an update fixes, or a damaged install.",
    causes: [
      { title: 'App bug or outdated version', probability: 'HIGH', why: 'Updates fix most crashes.' },
      { title: 'Damaged installation', probability: 'MEDIUM', why: 'Reinstalling fixes it.' },
    ],
    steps: [
      {
        title: 'Reopen the app',
        description: 'Click Reopen, or open the app again from Applications.',
        spoken: "Let's just try reopening the app first.",
        expected: 'The app opens and works.',
      },
      {
        title: 'Update the app',
        description: 'Update it from the App Store, or from the app menu → Check for Updates.',
        spoken: "If it crashes again, let's update it. ... Open the App Store, or use Check for updates in the app's menu.",
        expected: 'The app updates.',
      },
      {
        title: 'Reinstall the app',
        description: 'Drag the app from Applications to the Bin, then download it again from the App Store or the official website.',
        spoken: "Still crashing? ... Move the app to the Bin. ... Then download it again from the App Store or the official website.",
        expected: 'The fresh copy opens without crashing.',
      },
    ],
  },
  {
    id: 'mac-damaged-app',
    os: 'macOS',
    patterns: [/is damaged and can.?t be opened/i, /cannot be opened because the developer cannot be verified/i, /can.?t be opened because apple cannot check it/i],
    title: "Mac won't open the app",
    component: 'Gatekeeper (app security)',
    explanation:
      "macOS blocked the app because it couldn't verify it. ... That's a safety feature, so only continue if you trust where the app came from.",
    causes: [
      { title: 'Downloaded from outside the App Store', probability: 'HIGH', why: 'Gatekeeper checks unverified apps.' },
      { title: 'Download got corrupted', probability: 'MEDIUM', why: 'Re-downloading fixes it.' },
    ],
    steps: [
      {
        title: 'Download it again from the official site',
        description: "Delete the app, then download it again from the developer's official website or the App Store.",
        spoken: "Let's delete the app. ... Then download it again from the official website or the App Store.",
        expected: 'The new copy opens.',
      },
      {
        title: 'Allow a trusted app',
        description: 'If you trust it, open System Settings → Privacy & Security, scroll down, and click "Open Anyway" next to the app.',
        spoken: "If you trust this app, open System Settings, then Privacy and Security. ... Scroll down and click Open Anyway.",
        expected: 'The app opens.',
        caution: 'Never do this for apps from unknown sources, and never turn off Gatekeeper completely.',
      },
    ],
  },
];

/** Safe, general steps for an error that isn't in the library. */
export function genericSteps(os: KbOS | 'unknown'): KbStep[] {
  const restart: KbStep =
    os === 'macOS'
      ? { title: 'Restart your Mac', description: 'Apple menu → Restart.', spoken: "Let's restart your Mac. ... Open the Apple menu and choose Restart.", actionType: 'reboot_check', expected: 'The Mac restarts normally.' }
      : os === 'Linux'
      ? { title: 'Restart the computer', description: 'Restart from the system menu, or run the command below.', spoken: "Let's restart the computer. ... Use the system menu, or the command on your screen.", command: 'sudo reboot', actionType: 'terminal_cmd', admin: true, expected: 'The computer restarts.' }
      : { title: 'Restart the computer', description: 'Start → Power → Restart.', spoken: "Let's restart the computer. ... Click Start, then Power, then Restart.", actionType: 'reboot_check', expected: 'The computer restarts.' };
  const update: KbStep =
    os === 'macOS'
      ? { title: 'Install updates', description: 'System Settings → General → Software Update.', spoken: "Now let's install any updates. ... Open System Settings, then General, then Software Update.", expected: 'Your Mac is up to date.' }
      : os === 'Linux'
      ? { title: 'Install updates', description: 'Update your packages with the command below.', spoken: "Now let's install updates. ... Run the command on your screen.", command: 'sudo apt update && sudo apt upgrade -y', actionType: 'terminal_cmd', admin: true, expected: 'Updates install without errors.' }
      : { title: 'Install updates', description: 'Settings → Windows Update → Check for updates.', spoken: "Now let's install updates. ... Open Settings, then Windows Update, and check for updates.", expected: 'Windows is up to date.' };
  return [
    {
      title: 'Try it again',
      description: 'Close the message and repeat what you were doing. Some errors are one-off glitches.',
      spoken: "First, close the message and try again. ... Some errors are just one-off glitches.",
      expected: 'It works this time.',
    },
    restart,
    update,
    {
      title: 'Look up the exact error',
      description: "Search the exact error message or code on the official support site (Microsoft Support, Apple Support, or your Linux distribution's docs).",
      spoken: "If it keeps happening, search the exact error message on the official support site. ... I've written it on your screen.",
      expected: 'You find the official fix for this specific error.',
    },
  ];
}
