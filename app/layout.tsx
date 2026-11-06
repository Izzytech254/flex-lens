import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FixLens — AI Computer Technician',
  description: 'See it. Understand it. Fix it. The AI Computer Technician in your browser.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable}`}>
      <body className="bg-[#f5f8fc] text-slate-900 min-h-screen font-sans antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
