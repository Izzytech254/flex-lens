import { siteConfig } from '@/lib/site';

// Server-rendered, crawlable content describing FixLens. Search engines and AI
// assistants read this HTML directly (the interactive app above is client-side).
export default function SiteInfo() {
  const year = new Date().getFullYear();

  return (
    <div className="w-full bg-paper-deep/60 border-t border-hairline">
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-28 md:pb-16 text-ink">
        <section aria-labelledby="supported-errors" className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <p className="eyebrow text-accent-700">What it knows</p>
            <h2 id="supported-errors" className="mt-3 font-display font-semibold tracking-tight text-4xl sm:text-5xl leading-[1.05] tracking-tight">
              Common errors FixLens can diagnose
            </h2>
            <p className="mt-4 text-[15px] text-ink-soft leading-relaxed">
              Blue screens, macOS alerts, Linux terminal errors, installer failures and many more. If it can&apos;t read something
              clearly, it asks you to show it more instead of guessing.
            </p>
          </div>
          <ul className="border-t border-ink/15">
            {siteConfig.supportedErrors.map((e) => (
              <li key={e.code} className="py-3.5 border-b border-ink/15 flex items-baseline gap-4">
                <code className="font-mono text-xs text-accent-700 w-44 shrink-0 truncate">{e.code}</code>
                <span className="text-[15px] text-ink">{e.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq" className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <p className="eyebrow text-accent-700">Questions</p>
            <h2 id="faq" className="mt-3 font-display font-semibold tracking-tight text-4xl sm:text-5xl leading-[1.05] tracking-tight">
              Frequently asked
            </h2>
          </div>
          <div className="border-t border-ink/15">
            {siteConfig.faqs.map((f) => (
              <details key={f.q} className="group border-b border-ink/15">
                <summary className="cursor-pointer list-none py-5 flex items-center justify-between gap-4 font-display font-semibold tracking-tight text-lg text-ink rounded-sm">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 w-7 h-7 rounded-full border border-hairline flex items-center justify-center text-ink-soft text-lg leading-none transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 -mt-1 text-[15px] text-ink-soft leading-relaxed max-w-2xl">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-24 pt-6 border-t border-ink/15 flex flex-col sm:flex-row gap-3 justify-between text-sm text-ink-soft">
          <span>
            <span className="font-display font-semibold tracking-tight text-lg text-ink">
              Fix<span className="text-accent-500">Lens</span>
            </span>{' '}
            · © {year} · {siteConfig.shortDescription}
          </span>
          <nav aria-label="Footer" className="flex gap-5">
            <a href="#app" className="hover:text-ink">
              Open the app
            </a>
            <a href="/llms.txt" className="hover:text-ink">
              llms.txt
            </a>
            <a href="/sitemap.xml" className="hover:text-ink">
              Sitemap
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
