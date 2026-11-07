# FixLens — AI Computer Technician

**See it. Understand it. Fix it.** FixLens is a web app that diagnoses Windows errors from your camera or a screenshot using Google Gemini vision, explains them in plain English and walks you through the fix step by step, with optional voice narration.

## Features
- Live camera / screenshot error recognition (`/api/realtime-solve`)
- Diagnosis with observed symptoms, likely causes and confidence
- Step-by-step fix guide with commands, admin and safety notes
- "Ask FixLens" voice/text Q&A (`/api/voice`)
- Local history (browser `localStorage`, on-device only)
- Windows PC Companion (**preview**: actions are simulated; the `.ps1` only sends read-only telemetry)

## Getting started
```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY and NEXT_PUBLIC_SITE_URL
npm run dev
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Gemini API key (server-side only) |
| `NEXT_PUBLIC_SITE_URL` | for production | Public URL for canonical tags, Open Graph, sitemap, robots and llms.txt |
| `APP_URL` | optional | Fallback site URL (injected by AI Studio / Cloud Run) |
| `GEMINI_MODELS` | optional | Comma-separated model fallback list |

## Project structure
```
app/
  layout.tsx            SEO metadata + JSON-LD (WebSite, WebApplication, FAQPage)
  page.tsx              Server page: interactive app + crawlable SiteInfo
  robots.ts sitemap.ts manifest.ts opengraph-image.tsx icon.svg
  llms.txt/ llms-full.txt/   Plain-text summaries for AI assistants
  api/realtime-solve    Image → diagnosis (Gemini)
  api/voice             Q&A (Gemini)
  api/companion         Companion demo backend (in-memory, simulated)
components/
  FixLensApp.tsx        Client state machine for all screens
  SiteInfo.tsx          Server-rendered how-it-works, supported errors, FAQ
  screens/*             Home, Scanner, Diagnosis, FixGuide, Verification, History, Settings
lib/
  site.ts               Site name, description, keywords, FAQ (single source for SEO)
  gemini.ts             Gemini client with model fallback
  rate-limit.ts         Per-IP in-memory rate limiting for API routes
```

## SEO & AI discoverability checklist (after deploying)
1. Set `NEXT_PUBLIC_SITE_URL` to your real domain **before building** and redeploy.
2. Check these URLs load: `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt`, `/manifest.webmanifest`, `/opengraph-image`.
3. Add the site to [Google Search Console](https://search.google.com/search-console) and [Bing Webmaster Tools](https://www.bing.com/webmasters) and submit `/sitemap.xml`. Bing also powers ChatGPT search and Copilot results.
4. Validate structured data with the [Rich Results Test](https://search.google.com/test/rich-results).
5. Check link previews with a social card debugger (e.g. LinkedIn Post Inspector).
6. `robots.txt` explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) so assistants can learn about and recommend FixLens. Remove them from `app/robots.ts` if you do not want that.
7. Edit text in `lib/site.ts` to change the description, keywords or FAQ everywhere at once.

## Notes
- API routes have per-IP rate limits held in memory. Use a shared store (Redis/Upstash) if you run several instances.
- Companion sessions are in memory and reset on restart.
- `.aistudio/` artifacts are now in `.gitignore`. To stop tracking the ones already committed: `git rm -r --cached .aistudio`.
