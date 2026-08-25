import { getTranslations } from "next-intl/server";

/**
 * TODO(mock-data): gerçek isim/fotoğraf yok — yalnız rol (kullanıcının
 * verdiği gerçek çerçeve: kurucu hekim + onun mühendis arkadaşları). Avatar
 * kasıtlı olarak sahte bir fotoğraf gibi durmuyor; düz, işaretli bir
 * placeholder. Bkz. docs/mock-data-todo.md.
 */
export async function TeamSection() {
  const t = await getTranslations("nav.sections");
  const tTeam = await getTranslations("team");
  const roles = tTeam.raw("roles") as string[];

  return (
    <section id="ekip" className="border-t border-steel/20 py-24">
      <p className="font-mono-data text-xs uppercase tracking-[0.08em] text-steel">
        {t("ekip")}
      </p>
      <p className="mt-6 max-w-2xl font-body text-lg text-foreground">
        {tTeam("intro")}
      </p>
      <ul className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        {roles.map((role) => (
          <li key={role} className="flex flex-col gap-3">
            <div
              className="flex aspect-square items-center justify-center border border-steel/30 bg-foreground/5"
              aria-hidden="true"
            >
              <span className="font-display text-2xl font-semibold text-steel">
                {role.charAt(0)}
              </span>
            </div>
            <p className="font-mono-data text-xs uppercase tracking-[0.05em] text-foreground/80">
              {role}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
