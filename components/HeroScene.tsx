'use client';

import React, { useEffect, useState } from 'react';
import { cx } from '@/components/ui';
import { CreditedImage, HERO_PHOTOS, commonsImageUrl } from '@/lib/image-credits';

/**
 * Animated hero illustration: a computer shows an error, a phone running FixLens scans it,
 * locks onto the error, guides the fix with voice, and the computer ends up connected.
 * Phases loop: 0 show → 1 scan → 2 detect → 3 guide → 4 fixed.
 */

type Phase = 0 | 1 | 2 | 3 | 4;
const DURATIONS: Record<Phase, number> = { 0: 1800, 1: 2000, 2: 2200, 3: 3400, 4: 2800 };
const PHASE_LABELS = ['Show it', 'Detect', 'Guide', 'Fixed'];

function usePhase(): Phase {
  const [phase, setPhase] = useState<Phase>(0);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPhase(3);
      return;
    }
    let current: Phase = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      timer = setTimeout(() => {
        current = ((current + 1) % 5) as Phase;
        setPhase(current);
        tick();
      }, DURATIONS[current]);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return phase;
}

const fade = (visible: boolean): React.CSSProperties => ({
  opacity: visible ? 1 : 0,
  transition: 'opacity 450ms ease, transform 450ms ease',
});

/** The computer's screen, drawn in SVG so it scales crisply (also reused as the phone's camera view). */
function DesktopScreen({ phase, overlay = false }: { phase: Phase; overlay?: boolean }) {
  const errorVisible = phase < 4;
  const cursorAtTray = phase >= 3;
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full block" aria-hidden="true">
      <defs>
        <linearGradient id={overlay ? 'wp-o' : 'wp'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f3a35" />
          <stop offset="0.55" stopColor="#4d5a50" />
          <stop offset="1" stopColor="#857a66" />
        </linearGradient>
      </defs>

      {/* Wallpaper + desktop icons */}
      <rect width="320" height="200" fill={`url(#${overlay ? 'wp-o' : 'wp'})`} />
      {[20, 46, 72].map((y) => (
        <g key={y} opacity="0.85">
          <rect x="12" y={y} width="14" height="12" rx="2" fill="#f4f1eb" opacity="0.85" />
          <rect x="10" y={y + 15} width="18" height="2.5" rx="1" fill="#f4f1eb" opacity="0.6" />
        </g>
      ))}

      {/* Taskbar */}
      <rect y="186" width="320" height="14" fill="#0f1114" opacity="0.82" />
      <rect x="6" y="189" width="8" height="8" rx="1.5" fill="#e5582a" />
      {[20, 32, 44].map((x) => (
        <rect key={x} x={x} y="189.5" width="7" height="7" rx="1.5" fill="#f4f1eb" opacity="0.35" />
      ))}
      {/* Wi-Fi tray icon */}
      <g transform="translate(268 189)">
        <path d="M0 3.2 A6 6 0 0 1 8 3.2" stroke={phase === 4 ? '#7fc29b' : '#f4f1eb'} strokeWidth="1.1" fill="none" />
        <path d="M1.6 4.8 A3.6 3.6 0 0 1 6.4 4.8" stroke={phase === 4 ? '#7fc29b' : '#f4f1eb'} strokeWidth="1.1" fill="none" />
        <circle cx="4" cy="6.6" r="0.9" fill={phase === 4 ? '#7fc29b' : '#f4f1eb'} />
        {phase < 4 && <path d="M7 0.5 L9.5 3 M9.5 0.5 L7 3" stroke="#ef6b4b" strokeWidth="0.9" />}
      </g>
      <text x="284" y="195.6" fontSize="5.6" fill="#f4f1eb" fontFamily="ui-sans-serif, system-ui">
        10:42
      </text>

      {/* Error dialog */}
      <g style={{ ...fade(errorVisible), transform: errorVisible ? 'scale(1)' : 'scale(0.96)', transformOrigin: '160px 96px' }}>
        <rect x="70" y="48" width="180" height="96" rx="4" fill="#ffffff" />
        <rect x="70" y="48" width="180" height="16" rx="4" fill="#efece6" />
        <rect x="70" y="58" width="180" height="6" fill="#efece6" />
        <text x="78" y="59" fontSize="6.4" fill="#2a2e36" fontFamily="ui-sans-serif, system-ui" fontWeight="600">
          Network Connections
        </text>
        <path d="M239 53 L244 58 M244 53 L239 58" stroke="#6b7079" strokeWidth="1" />
        <circle cx="93" cy="87" r="10" fill="#c4321c" />
        <path d="M89 83 L97 91 M97 83 L89 91" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <text x="111" y="83" fontSize="7.2" fill="#15171c" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          Can&apos;t connect to this network
        </text>
        <text x="111" y="94" fontSize="5.6" fill="#545a65" fontFamily="ui-sans-serif, system-ui">
          The network location cannot be reached.
        </text>
        <text x="111" y="107" fontSize="6" fill="#c6441b" fontFamily="ui-monospace, monospace" fontWeight="700">
          Error code: 0x800704cf
        </text>
        <rect x="203" y="122" width="38" height="13" rx="2" fill="#f7f5f1" stroke="#c9c2b3" strokeWidth="0.8" />
        <text x="217" y="131" fontSize="6" fill="#15171c" fontFamily="ui-sans-serif, system-ui">
          OK
        </text>
      </g>

      {/* Wi-Fi flyout while the user follows the step */}
      <g style={fade(phase === 3)}>
        <rect x="214" y="132" width="96" height="48" rx="4" fill="#ffffff" />
        <text x="222" y="145" fontSize="6.2" fill="#15171c" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          Wi-Fi
        </text>
        <rect x="282" y="139.5" width="20" height="9" rx="4.5" fill="#e5582a" />
        <circle cx="297.5" cy="144" r="3.2" fill="#fff" />
        <text x="222" y="158" fontSize="5.4" fill="#545a65" fontFamily="ui-sans-serif, system-ui">
          HomeNetwork-5G
        </text>
        <text x="222" y="170" fontSize="5.2" fill="#c6441b" fontFamily="ui-sans-serif, system-ui">
          Reconnecting…
        </text>
      </g>

      {/* Success toast */}
      <g style={{ ...fade(phase === 4), transform: phase === 4 ? 'translateY(0)' : 'translateY(6px)' }}>
        <rect x="206" y="146" width="106" height="32" rx="4" fill="#ffffff" />
        <circle cx="221" cy="162" r="7" fill="#2f6b4f" />
        <path d="M217.5 162 L220 164.6 L224.6 159.6" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="233" y="160" fontSize="6.6" fill="#15171c" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          Connected
        </text>
        <text x="233" y="169" fontSize="5.2" fill="#545a65" fontFamily="ui-sans-serif, system-ui">
          Internet access restored
        </text>
      </g>

      {/* Mouse cursor (only on the real screen) */}
      {!overlay && (
        <g
          style={{
            transform: cursorAtTray ? 'translate(270px, 192px)' : 'translate(150px, 150px)',
            transition: 'transform 1100ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <path d="M0 0 L0 11 L3 8.4 L5.2 13 L7 12.2 L4.9 7.7 L8.6 7.6 Z" fill="#ffffff" stroke="#15171c" strokeWidth="0.8" />
        </g>
      )}

      {/* FixLens AR overlay (phone camera view only) */}
      {overlay && (
        <g>
          <rect
            x="64"
            y="42"
            width="192"
            height="108"
            rx="6"
            fill="rgba(229,88,42,0.10)"
            stroke="#e5582a"
            strokeWidth={phase === 1 ? 1.4 : 2.4}
            strokeDasharray={phase === 1 ? '6 5' : undefined}
            style={fade(phase === 1 || phase === 2 || phase === 3)}
          />
          <g style={fade(phase === 2 || phase === 3)}>
            <rect x="64" y="26" width="72" height="13" rx="3" fill="#e5582a" />
            <text x="70" y="35" fontSize="7" fill="#fff" fontFamily="ui-monospace, monospace" fontWeight="700">
              0x800704cf
            </text>
          </g>
          {/* Point at the Wi-Fi icon during guidance */}
          <g style={fade(phase === 3)}>
            <circle cx="272" cy="192" r="9" fill="none" stroke="#e5582a" strokeWidth="2" />
            <circle cx="272" cy="192" r="14" fill="none" stroke="#e5582a" strokeWidth="1" opacity="0.5" />
          </g>
        </g>
      )}
    </svg>
  );
}

/** macOS-style alert window (decorative). */
function MacAlertWindow() {
  return (
    <svg viewBox="0 0 260 150" className="w-full h-auto block" aria-hidden="true">
      <rect x="0.5" y="0.5" width="259" height="149" rx="12" fill="#f7f6f3" stroke="rgba(21,23,28,0.14)" />
      {/* Traffic lights */}
      <circle cx="16" cy="15" r="5" fill="#ff5f57" />
      <circle cx="31" cy="15" r="5" fill="#febc2e" />
      <circle cx="46" cy="15" r="5" fill="#28c840" />
      {/* Warning icon */}
      <path d="M38 38 L58 74 L18 74 Z" fill="#f2b63c" stroke="#d99a1f" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="36.6" y="49" width="2.8" height="13" rx="1.4" fill="#15171c" />
      <circle cx="38" cy="67" r="1.8" fill="#15171c" />
      {/* Message */}
      <text x="72" y="48" fontSize="10.5" fontWeight="700" fill="#15171c" fontFamily="-apple-system, ui-sans-serif, system-ui">
        The operation can’t be completed
      </text>
      <text x="72" y="62" fontSize="9" fill="#545a65" fontFamily="-apple-system, ui-sans-serif, system-ui">
        because an unexpected error occurred
      </text>
      <text x="72" y="76" fontSize="9" fill="#c6441b" fontWeight="600" fontFamily="ui-monospace, monospace">
        (error code -36)
      </text>
      {/* Buttons */}
      <rect x="132" y="112" width="54" height="22" rx="6" fill="#ffffff" stroke="rgba(21,23,28,0.18)" />
      <text x="159" y="126.5" fontSize="9.5" fill="#15171c" textAnchor="middle" fontFamily="-apple-system, ui-sans-serif, system-ui">
        Cancel
      </text>
      <rect x="194" y="112" width="52" height="22" rx="6" fill="#2a2e36" />
      <text x="220" y="126.5" fontSize="9.5" fill="#ffffff" textAnchor="middle" fontWeight="600" fontFamily="-apple-system, ui-sans-serif, system-ui">
        OK
      </text>
    </svg>
  );
}

/** Ubuntu-style terminal showing errors (decorative). */
function LinuxTerminalWindow() {
  const lines: Array<{ prompt?: boolean; text: string; color: string }> = [
    { prompt: true, text: 'sudo apt update', color: '#e8e6e1' },
    { text: 'Err:1 http://archive.ubuntu.com jammy InRelease', color: '#f07a6b' },
    { text: "  Temporary failure resolving 'archive.ubuntu.com'", color: '#bdbab3' },
    { text: 'E: Failed to fetch package lists', color: '#f07a6b' },
    { prompt: true, text: './backup.sh', color: '#e8e6e1' },
    { text: 'Segmentation fault (core dumped)', color: '#f07a6b' },
  ];
  return (
    <svg viewBox="0 0 300 172" className="w-full h-auto block" aria-hidden="true">
      <rect width="300" height="172" rx="10" fill="#1c1e22" />
      <path d="M10 0 H290 A10 10 0 0 1 300 10 V24 H0 V10 A10 10 0 0 1 10 0 Z" fill="#2c2e33" />
      <text x="150" y="16" fontSize="8.5" fill="#c9c6bf" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontWeight="600">
        user@ubuntu: ~
      </text>
      <circle cx="285" cy="12" r="6" fill="#e95420" />
      <path d="M282.6 9.6 L287.4 14.4 M287.4 9.6 L282.6 14.4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="268" cy="12" r="6" fill="#4a4c51" />
      <circle cx="251" cy="12" r="6" fill="#4a4c51" />

      {lines.map((l, i) => (
        <text key={i} x="12" y={42 + i * 15} fontSize="8.6" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          {l.prompt && (
            <>
              <tspan fill="#8fd16a" fontWeight="700">
                user@ubuntu
              </tspan>
              <tspan fill="#e8e6e1">:</tspan>
              <tspan fill="#7aa7e0">~</tspan>
              <tspan fill="#e8e6e1">$ </tspan>
            </>
          )}
          <tspan fill={l.color}>{l.text}</tspan>
        </text>
      ))}
      <text x="12" y={42 + lines.length * 15} fontSize="8.6" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        <tspan fill="#8fd16a" fontWeight="700">
          user@ubuntu
        </tspan>
        <tspan fill="#e8e6e1">:</tspan>
        <tspan fill="#7aa7e0">~</tspan>
        <tspan fill="#e8e6e1">$ </tspan>
      </text>
      <rect x="92" y={42 + lines.length * 15 - 8} width="5.5" height="10" fill="#e8e6e1" className="animate-blink" />
    </svg>
  );
}

/** Small OS label attached to each window. */
function OsTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'absolute rounded-md bg-ink px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-paper shadow-md',
        className
      )}
    >
      {children}
    </span>
  );
}

/** A real photo of an error screen, styled like a printed snapshot pinned behind the demo. */
function PhotoCard({
  photo,
  className,
  tilt,
  floatClass,
  tagSide,
}: {
  photo: CreditedImage;
  className: string;
  tilt: string;
  floatClass: string;
  tagSide: 'left' | 'right';
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null; // if the image can't load, just leave the space empty

  return (
    <div className={cx('absolute z-0', className)}>
      <div className={cx(tilt, 'animate-float', floatClass)}>
        <figure className="relative rounded-lg bg-white p-1.5 sm:p-2 shadow-[0_22px_40px_-16px_rgba(21,23,28,0.45)]">
          <div className="overflow-hidden rounded-[4px] bg-ink" style={{ aspectRatio: String(photo.ratio) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={commonsImageUrl(photo.file, 640)}
              srcSet={`${commonsImageUrl(photo.file, 480)} 480w, ${commonsImageUrl(photo.file, 800)} 800w`}
              sizes="(min-width: 1024px) 280px, 40vw"
              alt={photo.alt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover saturate-[0.85] contrast-[1.05]"
            />
          </div>
          <OsTag className={cx('-top-2.5', tagSide === 'left' ? 'left-3' : 'right-3')}>{photo.os}</OsTag>
          <figcaption className="sr-only">
            {photo.alt}. Photo by {photo.author}, {photo.license}, via Wikimedia Commons.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

function PhoneSheet({ phase }: { phase: Phase }) {
  // Bottom sheet content inside the phone UI, per phase.
  return (
    <div key={phase} className="animate-fadeIn">
      {phase === 0 && (
        <>
          <p className="text-[8px] font-mono uppercase tracking-[0.12em] text-ink-soft">Ready</p>
          <p className="mt-1 text-[11px] font-semibold text-ink leading-tight">Point at the error</p>
          <p className="mt-1 text-[8.5px] text-ink-soft leading-snug">FixLens finds it for you.</p>
        </>
      )}
      {phase === 1 && (
        <>
          <p className="text-[8px] font-mono uppercase tracking-[0.12em] text-accent-600">Scanning</p>
          <p className="mt-1 text-[11px] font-semibold text-ink leading-tight">Reading your screen…</p>
          <div className="mt-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-wave" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </>
      )}
      {phase === 2 && (
        <>
          <span className="inline-block rounded-full bg-accent-100 text-accent-700 text-[8px] font-mono px-1.5 py-0.5">Detected · 1.2s</span>
          <p className="mt-1.5 text-[11px] font-semibold text-ink leading-tight">Wi-Fi can&apos;t connect</p>
          <p className="mt-0.5 text-[8.5px] font-mono text-ink-soft">0x800704cf · WLAN AutoConfig</p>
        </>
      )}
      {phase === 3 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-mono uppercase tracking-[0.12em] text-ink-soft">Step 1 of 3</p>
            <div className="flex items-end gap-[2px] h-3" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-[2px] h-full rounded-full bg-accent-500 origin-bottom animate-wave"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          </div>
          <div className="mt-1 flex gap-[3px]">
            <span className="h-[3px] flex-1 rounded-full bg-accent-500" />
            <span className="h-[3px] flex-1 rounded-full bg-paper-deep" />
            <span className="h-[3px] flex-1 rounded-full bg-paper-deep" />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-ink leading-tight">Turn Wi-Fi off and on</p>
          <p className="mt-0.5 text-[8.5px] text-ink-soft leading-snug">Click the Wi-Fi icon on the taskbar.</p>
        </>
      )}
      {phase === 4 && (
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-moss-500 text-white flex items-center justify-center animate-pop">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M3.5 8.5 L6.5 11.5 L12.5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-semibold text-ink leading-tight">Fixed</p>
            <p className="text-[8.5px] text-ink-soft">Connection restored</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeroScene({ className }: { className?: string }) {
  const phase = usePhase();
  const stage = phase === 0 ? 0 : phase === 1 || phase === 2 ? 1 : phase === 3 ? 2 : 3;

  return (
    <figure
      className={cx('relative w-full max-w-[600px] mx-auto', className)}
      role="img"
      aria-label="Animation: a computer shows a Wi-Fi error, a phone running FixLens scans it, guides the fix step by step with voice, and the computer reconnects."
    >
      <div className="relative aspect-[6/5]">
        {/* Background: real photos of the same kind of problem on Linux, macOS and Windows */}
        <PhotoCard
          photo={HERO_PHOTOS[0]}
          className="left-[-10%] top-[-12%] w-[46%]"
          tilt="rotate-[-7deg]"
          floatClass="[animation-duration:6s] [animation-delay:-1.5s]"
          tagSide="left"
        />
        <PhotoCard
          photo={HERO_PHOTOS[1]}
          className="right-[-8%] top-[-6%] w-[42%]"
          tilt="rotate-[6deg]"
          floatClass="[animation-duration:7s] [animation-delay:-3s]"
          tagSide="right"
        />
        <PhotoCard
          photo={HERO_PHOTOS[2]}
          className="left-[-6%] bottom-[2%] w-[34%] hidden sm:block"
          tilt="rotate-[-4deg]"
          floatClass="[animation-duration:8s] [animation-delay:-5s]"
          tagSide="left"
        />

        {/* Computer (Windows) */}
        <div className="absolute left-0 top-[3%] w-[84%] z-10">
          <OsTag className="-top-3 left-4 z-20">Windows</OsTag>
          <div className="rounded-[14px] bg-ink p-[2.2%] shadow-[0_40px_80px_-30px_rgba(21,23,28,0.55)]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[6px]">
              <DesktopScreen phase={phase} />
            </div>
          </div>
          <div className="mx-auto w-[16%] h-[18px] bg-ink-2 [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)]" />
          <div className="mx-auto w-[36%] h-[6px] rounded-full bg-ink-2" />
        </div>

        {/* Spoken line bubble during guidance */}
        <div
          aria-hidden="true"
          className="absolute z-30 right-[30%] bottom-[46%] max-w-[46%] rounded-2xl rounded-br-sm bg-white border border-hairline px-3 py-2 shadow-lg text-[11px] sm:text-xs leading-snug text-ink"
          style={{ ...fade(phase === 3), transform: phase === 3 ? 'translateY(0)' : 'translateY(6px)' }}
        >
          <span className="block mb-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-600">FixLens · speaking</span>
          “Ok so, first thing. … Click the Wi-Fi icon on your taskbar.”
        </div>

        {/* Phone */}
        <div className="absolute right-0 bottom-0 w-[34%] z-20 animate-float">
          <div className="rotate-[-5deg] rounded-[26px] bg-ink p-[5px] shadow-[0_30px_60px_-20px_rgba(21,23,28,0.6)]">
            <div className="relative overflow-hidden rounded-[21px] bg-[#0b0c0f] aspect-[9/19]">
              {/* Status bar + app header */}
              <div className="absolute inset-x-0 top-0 z-10 px-3 pt-2 flex items-center justify-between text-[7px] text-white/80 font-mono">
                <span>10:42</span>
                <span className="w-10 h-2.5 rounded-full bg-black" />
                <span>5G</span>
              </div>
              <div className="absolute inset-x-0 top-[6%] z-10 px-3 flex items-center justify-between">
                <span className="text-[9px] font-semibold text-white">
                  Fix<span className="text-accent-400">Lens</span>
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[7px] text-white/90">
                  <span className={cx('w-1 h-1 rounded-full', phase === 4 ? 'bg-moss-100' : 'bg-accent-400 animate-pulse')} />
                  {phase === 4 ? 'Done' : phase === 3 ? 'Guiding' : 'Live'}
                </span>
              </div>

              {/* Camera view of the computer screen */}
              <div className="absolute inset-x-0 top-[13%] h-[50%] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a1c20] to-[#0b0c0f]" />
                <div
                  className="absolute left-1/2 top-1/2 w-[150%]"
                  style={{ transform: 'translate(-50%, -50%) perspective(500px) rotateX(8deg)' }}
                >
                  <div className="rounded-[4px] overflow-hidden ring-4 ring-[#1d2026]">
                    <DesktopScreen phase={phase} overlay />
                  </div>
                </div>
                {/* Viewfinder corners */}
                <div className="absolute inset-[8%] pointer-events-none">
                  <span className="absolute left-0 top-0 w-3 h-3 border-l-2 border-t-2 border-white/90 rounded-tl-md" />
                  <span className="absolute right-0 top-0 w-3 h-3 border-r-2 border-t-2 border-white/90 rounded-tr-md" />
                  <span className="absolute left-0 bottom-0 w-3 h-3 border-l-2 border-b-2 border-white/90 rounded-bl-md" />
                  <span className="absolute right-0 bottom-0 w-3 h-3 border-r-2 border-b-2 border-white/90 rounded-br-md" />
                </div>
                {phase === 1 && (
                  <span className="absolute inset-x-[8%] h-[2px] rounded-full bg-accent-400 shadow-[0_0_12px_2px_rgba(238,124,82,0.7)] animate-scanline" />
                )}
              </div>

              {/* Bottom sheet */}
              <div className="absolute inset-x-0 bottom-0 h-[37%] rounded-t-[14px] bg-paper px-3 pt-3">
                <PhoneSheet phase={phase} />
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-center">
                  <span className="w-8 h-8 rounded-full border-[2.5px] border-ink/80 p-[2px]">
                    <span className={cx('block w-full h-full rounded-full transition-colors', phase === 4 ? 'bg-moss-500' : 'bg-accent-500')} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stage indicator */}
      <figcaption className="mt-6 flex items-center justify-center gap-2 sm:gap-4" aria-hidden="true">
        {PHASE_LABELS.map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            <span
              className={cx(
                'w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] transition-colors',
                i === stage ? 'bg-accent-500 text-white' : i < stage ? 'bg-ink text-paper' : 'bg-paper-deep text-ink-soft'
              )}
            >
              {i + 1}
            </span>
            <span className={cx('text-xs transition-colors', i === stage ? 'text-ink font-medium' : 'text-ink-soft')}>{label}</span>
            {i < PHASE_LABELS.length - 1 && <span className="hidden sm:block w-6 h-px bg-hairline" />}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
