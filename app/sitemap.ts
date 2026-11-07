import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

// Rendered at request time so the runtime APP_URL / NEXT_PUBLIC_SITE_URL is used.
export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteConfig.url}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteConfig.url}/llms.txt`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteConfig.url}/llms-full.txt`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
