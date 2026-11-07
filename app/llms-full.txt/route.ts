import { buildLlmsFullTxt } from '@/lib/llms';

// Rendered at request time so the runtime APP_URL / NEXT_PUBLIC_SITE_URL is used.
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(buildLlmsFullTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
