import { getTranslations } from "next-intl/server";

/**
 * TODO(mock-data): isimler/fotoğraflar gerçek değil — kullanıcının verdiği
 * gerçek çerçeve (kurucu hekim + onun mühendis arkadaşları) korunuyor,
 * ama "Kaan Aydın" gibi isimler ve avatarlar placeholder. Avatar kasıtlı
 * olarak sahte bir fotoğraf gibi durmuyor; düz, işaretli bir kutu. Bkz.
 * docs/mock-data-todo.md.
 */
export async function TeamSection() {
  const t = await getTranslations("nav.sections");
  const tTeam = await getTranslations("team");
  const members = tTeam.raw("members") as {
    name: string;
    role: string;
    bio: string;
  }[];

  return (
    <section id="ekip" className="border-t border-steel/20 py-24">
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("ekip")}
      </p>
      <p className="mt-6 max-w-2xl font-body text-lg text-foreground">
        {tTeam("intro")}
      </p>
      <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {members.map((member) => (
          <li key={member.name} className="flex flex-col gap-3">
            <div
              className="flex aspect-square items-center justify-center border border-steel/30 bg-foreground/5"
              aria-hidden="true"
            >
              <span className="font-display text-2xl font-semibold text-steel">
                {member.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-body text-base font-semibold text-foreground">
                {member.name}
              </p>
              <p className="font-mono-data text-xs uppercase tracking-[0.05em] text-ahtapot">
                {member.role}
              </p>
              <p className="mt-1 font-body text-sm text-foreground/70">
                {member.bio}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
