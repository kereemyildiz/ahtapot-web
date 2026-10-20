import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/brand/LogoMark";
import { ScrubText } from "@/components/motion/ScrubText";
import { SectionRule } from "@/components/motion/SectionRule";
import { Words } from "@/components/motion/Words";
import { FounderMark } from "./FounderMark";

type Founder = { label: string; name: string; role: string; bio: string; areas: string[] };
type Pillar = { title: string; text: string };

/**
 * Hakkımızda: görünür bir bölüm başlığı, şirketin neden kurulduğu
 * (tıbbi cihazların yerlileştirilmesi), üç ilke ve kurucu.
 */
export async function About() {
  const t = await getTranslations("about");
  const facts = t.raw("facts") as { label: string; value: string }[];
  const pillars = t.raw("pillars") as Pillar[];
  const founder = t.raw("founder") as Founder;

  return (
    <section id="hakkimizda" aria-labelledby="hakkimizda-title" className="frame py-[clamp(7rem,14vw,13rem)]">
      <SectionRule />
      <h2 id="hakkimizda-title" data-split="" className="section-title">
        <Words text={t("heading")} />
      </h2>

      <div className="mt-[clamp(2.5rem,5vw,4rem)] grid gap-y-10 lg:grid-cols-12 lg:gap-x-12">
        {/* Logo işareti kendi sütununda; iki paragraf aynı sol kenardan başlar. */}
        <div className="flex gap-[clamp(1rem,2.5vw,2rem)] lg:col-span-8">
          <LogoMark className="mt-1 h-[clamp(3.5rem,2.5rem+3vw,6rem)] w-auto shrink-0" strokeWidth={34} gradientId="logo-about" />
          <div className="min-w-0">
            <ScrubText className="max-w-[34ch] text-[clamp(1.4rem,0.9rem+1.6vw,2.35rem)] leading-[1.25] tracking-[-0.01em] text-ink" text={t("lead")} />
            <p data-reveal="" className="mt-8 max-w-[52ch] text-lead leading-snug text-muted">
              {t("body")}
            </p>
          </div>
        </div>

        <dl data-reveal="" className="grid content-start gap-6 border-l-2 border-periwinkle/30 pl-6 text-small lg:col-span-3 lg:col-start-10">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-muted">{f.label}</dt>
              <dd className="mt-1 text-body text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Üç ilke: üst çizgileri sırayla belirir. */}
      <ul className="mt-[clamp(4rem,8vw,7rem)] grid gap-10 md:grid-cols-3 md:gap-8">
        {pillars.map((p) => (
          <li key={p.title} data-reveal="" className="border-t-2 border-periwinkle/50 pt-6">
            <h3 className="font-display text-[clamp(1.2rem,1rem+0.6vw,1.6rem)] font-medium leading-[1.15] tracking-[-0.02em]">{p.title}</h3>
            <p className="mt-3 max-w-[38ch] text-body text-ink/85">{p.text}</p>
          </li>
        ))}
      </ul>

      {/* Kurucu. */}
      <div className="mt-[clamp(5rem,10vw,9rem)] grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div data-reveal="" className="max-w-[26rem] lg:col-span-4 lg:col-start-2 lg:max-w-none">
          <FounderMark label={`${founder.label}: ${founder.name}`} />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p data-reveal="" className="text-small text-muted">
            {founder.label}
          </p>
          <h3 data-reveal="" className="display mt-3 text-[clamp(2rem,1.3rem+2.4vw,3.4rem)]">
            {founder.name}
          </h3>
          <p data-reveal="" className="mt-3 text-body text-accent">
            {founder.role}
          </p>
          <p data-reveal="" className="mt-8 max-w-[46ch] text-lead leading-snug text-ink/90">
            {founder.bio}
          </p>
          <ul data-reveal="" className="mt-8 flex flex-wrap gap-2">
            {founder.areas.map((area, i) => (
              <li key={area} className={`px-3 py-2 text-small ${i === 0 ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink"}`}>
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
