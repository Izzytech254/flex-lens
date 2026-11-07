'use client';

import React from 'react';
import { TroubleshootingStep } from '@/types/technician';
import { cx } from '@/components/ui';

/**
 * Small illustration for a fix step: picks a scene from what the step says (Wi-Fi, Settings, terminal,
 * restart, Device Manager, printer, updates, storage, browser, router…) and styles the window chrome
 * for Windows, macOS or Linux. An orange pulsing marker shows where to click.
 */

type Scene =
  | 'wifi'
  | 'settings'
  | 'terminal'
  | 'restart'
  | 'devices'
  | 'printer'
  | 'update'
  | 'storage'
  | 'browser'
  | 'router'
  | 'disk'
  | 'pro'
  | 'click';

type Os = 'Windows' | 'macOS' | 'Linux';

function pickScene(step: TroubleshootingStep): Scene {
  const t = `${step.title} ${step.description} ${step.command || ''}`.toLowerCase();
  if (step.command || /terminal|command prompt|powershell|\bcmd\b|sudo /.test(t)) return 'terminal';
  if (/professional|repair shop|technician|apple store/.test(t)) return 'pro';
  if (/router|unplug|modem/.test(t)) return 'router';
  if (/restart|reboot|shut ?down|power button|turn (it|the computer) (off|back on)/.test(t) || step.actionType === 'reboot_check') return 'restart';
  if (/wi-?fi|wireless|network icon|taskbar.*network/.test(t) && !/settings/.test(t)) return 'wifi';
  if (/device manager|driver|yellow warning/.test(t)) return 'devices';
  if (/printer|print|spooler/.test(t)) return 'printer';
  if (/update/.test(t)) return 'update';
  if (/storage|disk space|temporary files|recycle bin|bin\b|free (up )?space/.test(t)) return 'storage';
  if (/disk utility|first aid/.test(t)) return 'disk';
  if (/browser|website|chrome|edge|safari|firefox|dns/.test(t)) return 'browser';
  if (/settings|system preferences|control panel|privacy|apps|installed apps/.test(t)) return 'settings';
  return 'click';
}

function settingsItem(step: TroubleshootingStep): string {
  const t = `${step.title} ${step.description}`.toLowerCase();
  if (/network|wi-?fi|internet/.test(t)) return 'Network';
  if (/update/.test(t)) return 'Update';
  if (/storage|space/.test(t)) return 'Storage';
  if (/apps?|program|install/.test(t)) return 'Apps';
  if (/printer|bluetooth|device/.test(t)) return 'Devices';
  if (/privacy|security/.test(t)) return 'Privacy';
  return 'System';
}

/** Pulsing "click here" marker. */
function Marker({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="11" fill="none" stroke="#e5582a" strokeWidth="2" className="animate-pulse" />
      <circle cx={x} cy={y} r="4" fill="#e5582a" />
    </g>
  );
}

/** Window frame with OS-specific chrome. */
function Window({ os, x, y, w, h, title, dark = false, children }: {
  os: Os; x: number; y: number; w: number; h: number; title: string; dark?: boolean; children?: React.ReactNode;
}) {
  const bar = dark ? '#2c2e33' : '#ece8df';
  const titleColor = dark ? '#c9c6bf' : '#2a2e36';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="7" fill={dark ? '#1c1e22' : '#ffffff'} stroke="#d6cfbf" />
      <path d={`M${x + 7} ${y} H${x + w - 7} A7 7 0 0 1 ${x + w} ${y + 7} V${y + 18} H${x} V${y + 7} A7 7 0 0 1 ${x + 7} ${y} Z`} fill={bar} />
      {os === 'macOS' ? (
        <g>
          <circle cx={x + 11} cy={y + 9} r="3.2" fill="#ff5f57" />
          <circle cx={x + 21} cy={y + 9} r="3.2" fill="#febc2e" />
          <circle cx={x + 31} cy={y + 9} r="3.2" fill="#28c840" />
          <text x={x + w / 2} y={y + 12.5} fontSize="7" textAnchor="middle" fill={titleColor} fontWeight="600" fontFamily="ui-sans-serif, system-ui">{title}</text>
        </g>
      ) : os === 'Linux' ? (
        <g>
          <text x={x + w / 2} y={y + 12.5} fontSize="7" textAnchor="middle" fill={titleColor} fontWeight="600" fontFamily="ui-sans-serif, system-ui">{title}</text>
          <circle cx={x + w - 10} cy={y + 9} r="4" fill="#e95420" />
        </g>
      ) : (
        <g>
          <text x={x + 9} y={y + 12.5} fontSize="7" fill={titleColor} fontWeight="600" fontFamily="ui-sans-serif, system-ui">{title}</text>
          <path d={`M${x + w - 13} ${y + 6} l5 5 m0 -5 l-5 5`} stroke={titleColor} strokeWidth="1" />
        </g>
      )}
      {children}
    </g>
  );
}

/** Taskbar / menu bar with a Wi-Fi icon, per OS. Returns the Wi-Fi icon position. */
function SystemBar({ os }: { os: Os }) {
  if (os === 'Windows') {
    return (
      <g>
        <rect x="0" y="162" width="320" height="18" fill="#15171c" opacity="0.9" />
        <rect x="142" y="166" width="10" height="10" rx="2" fill="#e5582a" />
        {[158, 172, 186].map((x) => <rect key={x} x={x} y="167" width="9" height="9" rx="2" fill="#f4f1eb" opacity="0.35" />)}
        <WifiGlyph x={262} y={166} />
        <text x="280" y="174" fontSize="6" fill="#f4f1eb" fontFamily="ui-sans-serif, system-ui">10:42</text>
      </g>
    );
  }
  return (
    <g>
      <rect x="0" y="0" width="320" height="14" fill={os === 'macOS' ? '#f4f1eb' : '#15171c'} opacity="0.95" />
      <text x="8" y="10" fontSize="6.5" fontWeight="700" fill={os === 'macOS' ? '#15171c' : '#f4f1eb'} fontFamily="ui-sans-serif, system-ui">
        {os === 'macOS' ? 'Finder' : 'Activities'}
      </text>
      <WifiGlyph x={262} y={3} dark={os === 'macOS'} />
      <text x="280" y="10" fontSize="6" fill={os === 'macOS' ? '#15171c' : '#f4f1eb'} fontFamily="ui-sans-serif, system-ui">10:42</text>
    </g>
  );
}

function WifiGlyph({ x, y, dark = false }: { x: number; y: number; dark?: boolean }) {
  const c = dark ? '#15171c' : '#f4f1eb';
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 3.2 A6 6 0 0 1 9 3.2" stroke={c} strokeWidth="1.2" fill="none" />
      <path d="M1.8 5 A3.8 3.8 0 0 1 7.2 5" stroke={c} strokeWidth="1.2" fill="none" />
      <circle cx="4.5" cy="7" r="1" fill={c} />
    </g>
  );
}

function Desktop() {
  return <rect width="320" height="180" fill="#3e4a44" />;
}

function SceneSvg({ scene, os, step }: { scene: Scene; os: Os; step: TroubleshootingStep }) {
  const wifiY = os === 'Windows' ? 171 : 8;
  const flyoutY = os === 'Windows' ? 98 : 20;
  const item = settingsItem(step);
  const command = (step.command || '').slice(0, 46) + ((step.command || '').length > 46 ? '…' : '');
  const prompt = os === 'Windows' ? 'PS C:\\>' : os === 'macOS' ? '%' : '$';

  switch (scene) {
    case 'wifi':
      return (
        <>
          <Desktop />
          <SystemBar os={os} />
          <g>
            <rect x="196" y={flyoutY} width="116" height="58" rx="6" fill="#ffffff" />
            <text x="206" y={flyoutY + 16} fontSize="8" fontWeight="700" fill="#15171c" fontFamily="ui-sans-serif, system-ui">Wi-Fi</text>
            <rect x="276" y={flyoutY + 8} width="26" height="12" rx="6" fill="#e5582a" />
            <circle cx="296" cy={flyoutY + 14} r="4.4" fill="#fff" />
            <text x="206" y={flyoutY + 34} fontSize="6.5" fill="#545a65" fontFamily="ui-sans-serif, system-ui">HomeNetwork-5G</text>
            <rect x="206" y={flyoutY + 40} width="44" height="11" rx="3" fill="#15171c" />
            <text x="228" y={flyoutY + 48} fontSize="6" fill="#fff" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">Connect</text>
          </g>
          <Marker x={266} y={wifiY} />
          <Marker x={289} y={flyoutY + 14} />
        </>
      );
    case 'settings': {
      const items = ['System', 'Network', 'Devices', 'Apps', 'Update', 'Storage', 'Privacy'];
      const idx = Math.max(0, items.indexOf(item));
      return (
        <>
          <Desktop />
          <Window os={os} x={30} y={16} w={260} h={150} title={os === 'macOS' ? 'System Settings' : 'Settings'}>
            <rect x="30" y="34" width="78" height="132" fill="#f4f1eb" />
            {items.map((label, i) => (
              <g key={label}>
                {i === idx && <rect x="35" y={40 + i * 17} width="68" height="14" rx="4" fill="#fbe6dc" />}
                <text x="42" y={50 + i * 17} fontSize="7" fill={i === idx ? '#983415' : '#2a2e36'} fontWeight={i === idx ? 700 : 400} fontFamily="ui-sans-serif, system-ui">{label}</text>
              </g>
            ))}
            <text x="120" y="52" fontSize="10" fontWeight="700" fill="#15171c" fontFamily="ui-sans-serif, system-ui">{item}</text>
            {[64, 84, 104, 124].map((y) => <rect key={y} x="120" y={y} width="156" height="14" rx="4" fill="#f4f1eb" />)}
          </Window>
          <Marker x={70} y={47 + idx * 17} />
        </>
      );
    }
    case 'terminal':
      return (
        <>
          <Desktop />
          <Window os={os} x={22} y={22} w={276} h={136} title={os === 'Windows' ? 'Terminal (Admin)' : 'Terminal'} dark>
            <text x="34" y="56" fontSize="7.5" fontFamily="ui-monospace, monospace" fill="#8fd16a">{prompt}</text>
            <text x={os === 'Windows' ? 68 : 44} y="56" fontSize="7.5" fontFamily="ui-monospace, monospace" fill="#f4a988">
              {command || 'your command here'}
            </text>
            <rect x="34" y="66" width="5" height="9" fill="#e8e6e1" className="animate-blink" />
            <text x="34" y="98" fontSize="6.5" fontFamily="ui-sans-serif, system-ui" fill="#8a8781">
              Copy the command from FixLens, paste it here, press Enter.
            </text>
          </Window>
          <Marker x={52} y={53} />
        </>
      );
    case 'restart':
      return (
        <>
          <Desktop />
          {os === 'Windows' && <SystemBar os={os} />}
          <g>
            <rect x="110" y="40" width="100" height="78" rx="8" fill="#ffffff" />
            {['Sleep', 'Shut down', 'Restart'].map((label, i) => (
              <g key={label}>
                {label === 'Restart' && <rect x="116" y={48 + i * 22} width="88" height="18" rx="4" fill="#fbe6dc" />}
                <text x="132" y={60 + i * 22} fontSize="8" fill={label === 'Restart' ? '#983415' : '#15171c'} fontWeight={label === 'Restart' ? 700 : 400} fontFamily="ui-sans-serif, system-ui">{label}</text>
              </g>
            ))}
            <circle cx="160" cy="138" r="12" fill="#15171c" />
            <path d="M160 131 v7 M154 134 a8 8 0 1 0 12 0" stroke="#f4f1eb" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </g>
          <Marker x={124} y={101} />
        </>
      );
    case 'devices':
      return (
        <>
          <Desktop />
          <Window os={os} x={40} y={18} w={240} h={146} title="Device Manager">
            {['Audio inputs and outputs', 'Display adapters', 'Network adapters', 'Universal Serial Bus'].map((label, i) => (
              <g key={label}>
                <text x="64" y={54 + i * 22} fontSize="7.5" fill="#15171c" fontFamily="ui-sans-serif, system-ui">{label}</text>
                {i === 2 && (
                  <g>
                    <path d={`M50 ${46 + i * 22} l6 10 h-12 z`} fill="#f2b63c" />
                    <text x="49" y={55 + i * 22} fontSize="7" fontWeight="700" fill="#15171c">!</text>
                  </g>
                )}
              </g>
            ))}
          </Window>
          <Marker x={50} y={95} />
        </>
      );
    case 'printer':
      return (
        <>
          <Desktop />
          <Window os={os} x={30} y={18} w={260} h={146} title="Printers & scanners">
            <rect x="56" y="54" width="64" height="40" rx="6" fill="#545a65" />
            <rect x="64" y="40" width="48" height="18" rx="2" fill="#ffffff" stroke="#d6cfbf" />
            <rect x="66" y="88" width="44" height="16" rx="2" fill="#ffffff" stroke="#d6cfbf" />
            <text x="140" y="60" fontSize="8" fontWeight="700" fill="#15171c" fontFamily="ui-sans-serif, system-ui">Office Printer</text>
            <text x="140" y="74" fontSize="6.5" fill="#c6441b" fontFamily="ui-sans-serif, system-ui">Offline · 2 documents stuck</text>
            <rect x="140" y="88" width="70" height="14" rx="4" fill="#15171c" />
            <text x="175" y="97.5" fontSize="6.5" fill="#fff" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">Print test page</text>
          </Window>
          <Marker x={175} y={95} />
        </>
      );
    case 'update':
      return (
        <>
          <Desktop />
          <Window os={os} x={30} y={18} w={260} h={146} title={os === 'macOS' ? 'Software Update' : os === 'Linux' ? 'Software Updater' : 'Windows Update'}>
            <circle cx="80" cy="84" r="20" fill="#fbe6dc" />
            <path d="M70 80 a11 11 0 0 1 19 -4 M90 88 a11 11 0 0 1 -19 4" stroke="#e5582a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <text x="114" y="74" fontSize="9" fontWeight="700" fill="#15171c" fontFamily="ui-sans-serif, system-ui">Updates available</text>
            <rect x="114" y="86" width="86" height="16" rx="4" fill="#15171c" />
            <text x="157" y="96.5" fontSize="7" fill="#fff" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">Check for updates</text>
          </Window>
          <Marker x={157} y={94} />
        </>
      );
    case 'storage':
      return (
        <>
          <Desktop />
          <Window os={os} x={30} y={18} w={260} h={146} title="Storage">
            <text x="50" y="58" fontSize="9" fontWeight="700" fill="#15171c" fontFamily="ui-sans-serif, system-ui">Local disk</text>
            <rect x="50" y="66" width="220" height="12" rx="6" fill="#e9e4d9" />
            <rect x="50" y="66" width="206" height="12" rx="6" fill="#c6441b" />
            <text x="50" y="92" fontSize="6.5" fill="#545a65" fontFamily="ui-sans-serif, system-ui">1.2 GB free of 237 GB</text>
            <rect x="50" y="104" width="96" height="16" rx="4" fill="#15171c" />
            <text x="98" y="114.5" fontSize="7" fill="#fff" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">Temporary files</text>
          </Window>
          <Marker x={98} y={112} />
        </>
      );
    case 'disk':
      return (
        <>
          <Desktop />
          <Window os={os} x={30} y={18} w={260} h={146} title="Disk Utility">
            <rect x="46" y="48" width="40" height="30" rx="5" fill="#9aa0a8" />
            <text x="100" y="62" fontSize="8.5" fontWeight="700" fill="#15171c" fontFamily="ui-sans-serif, system-ui">External Drive</text>
            <rect x="200" y="40" width="60" height="16" rx="4" fill="#15171c" />
            <text x="230" y="50.5" fontSize="7" fill="#fff" textAnchor="middle" fontFamily="ui-sans-serif, system-ui">First Aid</text>
          </Window>
          <Marker x={230} y={48} />
        </>
      );
    case 'browser':
      return (
        <>
          <Desktop />
          <Window os={os} x={22} y={16} w={276} h={150} title="Browser">
            <rect x="34" y="40" width="252" height="14" rx="7" fill="#f4f1eb" />
            <text x="44" y="50" fontSize="6.5" fill="#545a65" fontFamily="ui-sans-serif, system-ui">https://example.com</text>
            <text x="160" y="96" fontSize="9" fontWeight="700" textAnchor="middle" fill="#15171c" fontFamily="ui-sans-serif, system-ui">This site can’t be reached</text>
            <text x="160" y="110" fontSize="6.5" textAnchor="middle" fill="#c6441b" fontFamily="ui-monospace, monospace">DNS_PROBE_FINISHED_BAD_CONFIG</text>
          </Window>
          <Marker x={60} y={47} />
        </>
      );
    case 'router':
      return (
        <>
          <rect width="320" height="180" fill="#f4f1eb" />
          <rect x="100" y="86" width="120" height="34" rx="8" fill="#15171c" />
          {[118, 132, 146].map((x) => <circle key={x} cx={x} cy="103" r="3" fill="#8fd16a" />)}
          <path d="M120 86 L112 50 M200 86 L208 50" stroke="#15171c" strokeWidth="4" strokeLinecap="round" />
          <path d="M220 104 C250 104 250 140 280 140" stroke="#545a65" strokeWidth="4" fill="none" />
          <rect x="276" y="132" width="20" height="16" rx="3" fill="#e5582a" />
          <text x="160" y="160" fontSize="8" textAnchor="middle" fill="#15171c" fontFamily="ui-sans-serif, system-ui">Unplug for 30 seconds, then plug back in</text>
          <Marker x={286} y={140} />
        </>
      );
    case 'pro':
      return (
        <>
          <rect width="320" height="180" fill="#f4f1eb" />
          <circle cx="160" cy="74" r="26" fill="#15171c" />
          <path d="M150 74 l7 7 l14 -14" stroke="#e5582a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="160" y="126" fontSize="10" fontWeight="700" textAnchor="middle" fill="#15171c" fontFamily="ui-sans-serif, system-ui">Time for a professional check</text>
          <text x="160" y="142" fontSize="7" textAnchor="middle" fill="#545a65" fontFamily="ui-sans-serif, system-ui">Back up your files first if you can</text>
        </>
      );
    default:
      return (
        <>
          <Desktop />
          <SystemBar os={os} />
          <Window os={os} x={60} y={30} w={200} h={110} title="Your screen">
            <rect x="80" y="64" width="160" height="10" rx="3" fill="#f4f1eb" />
            <rect x="80" y="82" width="120" height="10" rx="3" fill="#f4f1eb" />
            <rect x="80" y="104" width="60" height="16" rx="4" fill="#15171c" />
          </Window>
          <path d="M150 116 L150 129 L153.5 126 L156 131.5 L158.2 130.6 L155.8 125.2 L160.2 125.1 Z" fill="#ffffff" stroke="#15171c" strokeWidth="0.8" />
          <Marker x={110} y={112} />
        </>
      );
  }
}

export default function StepIllustration({
  step,
  os,
  className,
}: {
  step: TroubleshootingStep;
  os?: string | null;
  className?: string;
}) {
  const normalized: Os = /mac/i.test(os || '') ? 'macOS' : /linux|ubuntu|debian|fedora/i.test(os || '') ? 'Linux' : 'Windows';
  const scene = pickScene(step);
  return (
    <figure className={cx('overflow-hidden rounded-xl border border-hairline bg-paper-deep', className)}>
      <svg viewBox="0 0 320 180" className="w-full h-auto block" role="img" aria-label={`Illustration: ${step.title}`}>
        <SceneSvg scene={scene} os={normalized} step={step} />
      </svg>
    </figure>
  );
}
