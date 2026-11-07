import type { ProductSection } from "@/content/schema";

/**
 * Ürün sayfasında sergiden sonra gelen düz metin bölümleri (products.<slug>.sections).
 * Sunucuda çizilir, istemciye JS göndermez: arama motoru ve yapay zekâ asistanları
 * metni ham HTML'de okur. Her bölüm bir h2; solda başlık, sağda içerik.
 */
export function ProductSections({ sections }: { sections: ProductSection[] }) {
  if (sections.length === 0) return null;
  return (
    <div className="mt-[clamp(5rem,10vw,9rem)]">
      {sections.map((s, i) => (
        <section
          key={i}
          data-reveal=""
          className="grid gap-6 border-t border-periwinkle/15 py-[clamp(2.5rem,5vw,4rem)] lg:grid-cols-12 lg:gap-12"
        >
          <h2 className="display text-[clamp(1.5rem,1.1rem+1.2vw,2.25rem)] text-balance lg:col-span-4">{s.heading}</h2>

          <div className="max-w-[68ch] lg:col-span-7 lg:col-start-6">
            {s.body && (
              <div className="space-y-4">
                {s.body.map((p, i) => (
                  <p key={i} className="text-body leading-relaxed text-ink/90">
                    {p}
                  </p>
                ))}
              </div>
            )}

            {s.items && (
              <ul className={`grid gap-2 ${s.body ? "mt-6" : ""}`}>
                {s.items.map((it, i) => (
                  <li key={i} className="flex gap-3 text-body leading-relaxed">
                    <span className="mt-[0.65em] size-1.5 shrink-0 bg-accent" aria-hidden="true" />
                    {it}
                  </li>
                ))}
              </ul>
            )}

            {s.steps && (
              <ol className={`grid gap-4 ${s.body ? "mt-6" : ""}`}>
                {s.steps.map((it, i) => (
                  <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-3 text-body leading-relaxed">
                    <span className="font-display font-medium tabular-nums text-accent" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span>{it}</span>
                  </li>
                ))}
              </ol>
            )}

            {s.specs && (
              <dl className={`grid ${s.body ? "mt-6" : ""}`}>
                {s.specs.map((row, i) => (
                  <div key={i} className="grid gap-1 border-b border-periwinkle/15 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
                    <dt className="text-small text-muted">{row.label}</dt>
                    <dd className="text-body">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {s.faq && (
              <div className={`grid ${s.body ? "mt-6" : ""}`}>
                {s.faq.map((f, i) => (
                  <details key={i} className="group border-b border-periwinkle/15 first:border-t">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-4 text-body font-medium transition-colors duration-200 hover:text-accent [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <span className="relative mt-[0.45em] size-3 shrink-0" aria-hidden="true">
                        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-current" />
                        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-current transition-transform duration-200 group-open:scale-y-0" />
                      </span>
                    </summary>
                    <p className="pb-5 text-body leading-relaxed text-ink/90">{f.a}</p>
                  </details>
                ))}
              </div>
            )}

            {s.note && <p className="mt-6 text-small text-muted">{s.note}</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
