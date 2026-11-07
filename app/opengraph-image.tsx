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
          background: '#15171c',
          borderBottom: '16px solid #e5582a',
          color: '#f4f1eb',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: '#e5582a',
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
          Point your phone at any computer error. Get the fix, step by step.
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 48, fontSize: 26 }}>
          {['0x800704cf', '0x000006ba', '0x80070002', 'BSOD'].map((code) => (
            <div
              key={code}
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                background: 'rgba(244,241,235,0.10)',
                border: '1px solid rgba(244,241,235,0.2)',
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
