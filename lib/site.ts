// Central site configuration used for SEO metadata, sitemap, robots, llms.txt and JSON-LD.
// Set NEXT_PUBLIC_SITE_URL (preferred) or APP_URL to your public domain when hosting.

function resolveSiteUrl(): string {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.APP_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];
  for (const raw of candidates) {
    if (!raw) continue;
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const url = new URL(withProtocol);
      return url.origin;
    } catch {
      // Ignore placeholders such as "MY_APP_URL"
    }
  }
  return 'http://localhost:3000';
}

export const siteConfig = {
  name: 'FixLens',
  title: 'FixLens — AI Computer Technician for Windows Errors',
  shortDescription: 'See it. Understand it. Fix it.',
  description:
    'FixLens is a free AI computer technician in your browser. Point your camera at a Windows error or upload a screenshot and get a plain-English diagnosis, likely causes and step-by-step fixes for Wi-Fi, printer, Windows Update, blue screen (BSOD) and app crash errors.',
  url: resolveSiteUrl(),
  locale: 'en_US',
  keywords: [
    'AI computer technician',
    'fix Windows errors',
    'Windows error code lookup',
    'screenshot error diagnosis',
    'AI tech support',
    'Wi-Fi not connecting fix',
    '0x800704cf',
    'printer spooler error 0x000006ba',
    'Windows Update error 0x80070002',
    'blue screen BSOD fix',
    '0xc0000005 application error',
    'PowerShell troubleshooting',
    'computer repair assistant',
    'Gemini vision troubleshooting',
  ],
  supportedErrors: [
    { code: '0x800704cf', name: 'Wi-Fi / network location cannot be reached' },
    { code: '0x000006ba', name: 'Print Spooler service is not running (RPC server unavailable)' },
    { code: '0x80070002', name: 'Windows Update files missing or corrupted' },
    { code: '0xc0000005', name: 'Application unable to start correctly (access violation)' },
    { code: '1603', name: 'Windows Installer fatal error during installation' },
    { code: 'Code 43', name: 'Device Manager: Windows has stopped this device' },
    { code: 'DNS_PROBE_FINISHED_BAD_CONFIG', name: 'DNS configuration failure' },
    { code: 'Low disk space', name: 'System drive (C:) almost full' },
  ],
  faqs: [
    {
      q: 'What is FixLens?',
      a: 'FixLens is an AI computer technician that runs in your web browser. It reads Windows error messages from your camera or a screenshot, explains the problem in plain English and guides you through the fix step by step, with optional voice narration.',
    },
    {
      q: 'How do I fix a Windows error with FixLens?',
      a: 'Open FixLens, press Start Scanning and point your phone or webcam at the error on your screen, or upload a screenshot. FixLens identifies the error code and affected component, lists likely causes and shows numbered fix steps, including exact PowerShell commands when needed.',
    },
    {
      q: 'Which problems can FixLens diagnose?',
      a: 'Common Windows problems such as Wi-Fi that cannot connect (0x800704cf), printers not found or Print Spooler errors (0x000006ba), Windows Update failures (0x80070002), app crashes (0xc0000005), installer error 1603, Device Manager Code 43, DNS errors, low disk space and blue screen stop codes.',
    },
    {
      q: 'Is FixLens free and do I need to install anything?',
      a: 'FixLens works in any modern browser with no installation. Your diagnosis history is stored only on your device in local storage.',
    },
    {
      q: 'Does FixLens run commands on my computer?',
      a: 'No. FixLens shows commands for you to review and run yourself. Always read a command before running it, especially ones that need administrator rights.',
    },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
