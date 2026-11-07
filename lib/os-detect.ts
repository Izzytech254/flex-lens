'use client';

export type ComputerOS = 'Windows' | 'macOS' | 'Linux';
export type OsChoice = 'auto' | ComputerOS;

const STORAGE_KEY = 'fixlens_os_choice';

/**
 * Guesses the OS of the computer running this browser. Returns null on phones/tablets: when the user
 * scans with a phone, the phone is NOT the computer with the problem, so its OS tells us nothing.
 */
export function detectBrowserOS(): ComputerOS | null {
  if (typeof navigator === 'undefined') return null;
  const uaData = (navigator as any).userAgentData;
  const platform = String(uaData?.platform || navigator.platform || '').toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  const mobile = uaData?.mobile === true || /android|iphone|ipad|ipod|mobile/i.test(ua);
  // iPadOS reports itself as a Mac — touch support gives it away.
  const touchMac = /mac/.test(platform) && (navigator.maxTouchPoints || 0) > 1;
  if (mobile || touchMac) return null;
  if (/win/.test(platform) || /windows/.test(ua)) return 'Windows';
  if (/mac/.test(platform) || /mac os x/.test(ua)) return 'macOS';
  if (/linux|x11|cros/.test(platform) || /linux/.test(ua)) return 'Linux';
  return null;
}

export function loadOsChoice(): OsChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'Windows' || v === 'macOS' || v === 'Linux' || v === 'auto') return v;
  } catch {
    // ignore
  }
  return 'auto';
}

export function saveOsChoice(choice: OsChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // ignore
  }
}

/** Normalises any OS string from the AI ("Windows 11", "Linux (Ubuntu)") to one of the three, or null. */
export function normaliseOS(value: unknown): ComputerOS | null {
  const s = String(value || '').toLowerCase();
  if (/windows/.test(s)) return 'Windows';
  if (/mac/.test(s)) return 'macOS';
  if (/linux|ubuntu|debian|fedora|arch|mint/.test(s)) return 'Linux';
  return null;
}
