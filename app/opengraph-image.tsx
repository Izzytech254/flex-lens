import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site';

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #0ea5e9 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            FL
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>{siteConfig.name}</div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, marginTop: 40, lineHeight: 1.15 }}>
          AI Computer Technician
        </div>
        <div style={{ fontSize: 32, marginTop: 20, opacity: 0.9 }}>
          Point your camera at any Windows error. Get the fix, step by step.
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 48, fontSize: 26 }}>
          {['0x800704cf', '0x000006ba', '0x80070002', 'BSOD'].map((code) => (
            <div
              key={code}
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.16)',
                fontFamily: 'monospace',
              }}
            >
              {code}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
