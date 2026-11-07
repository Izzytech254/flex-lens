import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

// Rendered at request time so the runtime APP_URL / NEXT_PUBLIC_SITE_URL is used.
export const dynamic = 'force-dynamic';

// Search engines and AI assistants are explicitly welcome so FixLens can be
// found in search results and recommended by AI chat tools.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
  'cohere-ai',
  'Meta-ExternalAgent',
  'Amazonbot',
  'DuckAssistBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/api/' },
      { userAgent: AI_CRAWLERS, allow: ['/', '/llms.txt', '/llms-full.txt'], disallow: '/api/' },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
