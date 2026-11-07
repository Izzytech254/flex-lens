import { siteConfig } from '@/lib/site';

// Server-rendered, crawlable content describing FixLens. Search engines and AI
// assistants read this HTML directly (the interactive app above is client-side).
export default function SiteInfo() {
  const year = new Date().getFullYear();

  return (
    <div className="w-full bg-white border-t border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12 text-slate-700">
        <section aria-labelledby="how-it-works" className="space-y-4">
          <h2 id="how-it-works" className="text-xl font-extrabold text-slate-900">
            How FixLens fixes computer errors
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <li className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <strong className="block text-slate-900 mb-1">1. Show the error</strong>
              Point your phone or webcam at the error on your screen, or upload a screenshot.
            </li>
            <li className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <strong className="block text-slate-900 mb-1">2. Understand it</strong>
              FixLens reads the error code, names the affected Windows component and explains the likely causes in plain English.
            </li>
            <li className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <strong className="block text-slate-900 mb-1">3. Fix it step by step</strong>
              Follow numbered steps with voice narration, exact PowerShell commands and safety notes.
            </li>
          </ol>
        </section>

        <section aria-labelledby="supported-errors" className="space-y-4">
          <h2 id="supported-errors" className="text-xl font-extrabold text-slate-900">
            Common errors FixLens can diagnose
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {siteConfig.supportedErrors.map((e) => (
              <li key={e.code} className="flex items-start gap-2">
                <code className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                  {e.code}
                </code>
                <span>{e.name}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm">
            FixLens also recognises blue screen (BSOD) stop codes, macOS alerts, Linux terminal errors, installer failures and many
            other problems shown on screen — and if it can&apos;t read something clearly, it asks you to show it more.
          </p>
        </section>

        <section aria-labelledby="faq" className="space-y-3">
          <h2 id="faq" className="text-xl font-extrabold text-slate-900">
            Frequently asked questions
          </h2>
          {siteConfig.faqs.map((f) => (
            <details key={f.q} className="group p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <summary className="cursor-pointer font-bold text-slate-900 text-sm">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </section>

        <footer className="pt-6 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 justify-between">
          <span>
            © {year} {siteConfig.name} — {siteConfig.shortDescription} Powered by Google Gemini.
          </span>
          <nav aria-label="Footer" className="flex gap-4">
            <a href="#app" className="hover:text-slate-800">Open the app</a>
            <a href="/llms.txt" className="hover:text-slate-800">llms.txt</a>
            <a href="/sitemap.xml" className="hover:text-slate-800">Sitemap</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
