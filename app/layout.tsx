import type { Metadata, Viewport } from 'next';
import { Inter_Tight, Schibsted_Grotesk, JetBrains_Mono } from 'next/font/google';
import { siteConfig } from '@/lib/site';
import './globals.css';

// "Workbench" type: Schibsted Grotesk for headlines, Inter Tight for interface text,
// JetBrains Mono for labels and error codes.
const sansFont = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const displayFont = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: 'technology',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    locale: siteConfig.locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    // Points AI assistants to the plain-text site summary (llmstxt.org convention)
    'llms-txt': `${siteConfig.url}/llms.txt`,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#15171c',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: 'en',
    },
    {
      '@type': 'WebApplication',
      '@id': `${siteConfig.url}/#app`,
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      applicationCategory: 'UtilitiesApplication',
      applicationSubCategory: 'Computer troubleshooting',
      operatingSystem: 'Any (web browser); diagnoses Windows, macOS and Linux',
      browserRequirements: 'Requires a modern browser with JavaScript. Camera optional.',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Diagnose Windows errors from a camera view or screenshot',
        'Plain-English explanation of error codes',
        'Step-by-step fix guides with PowerShell commands',
        'Voice narration and voice questions',
        'Local diagnosis history',
      ],
      image: `${siteConfig.url}/opengraph-image`,
    },
    {
      '@type': 'FAQPage',
      '@id': `${siteConfig.url}/#faq`,
      mainEntity: siteConfig.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sansFont.variable} ${displayFont.variable} ${monoFont.variable}`}>
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-readable summary" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      </head>
      <body className="bg-paper text-ink min-h-screen font-sans antialiased selection:bg-accent-300 selection:text-ink">
        {children}
      </body>
    </html>
  );
}
