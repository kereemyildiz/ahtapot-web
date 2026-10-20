import { Fragment } from "react";

/**
 * Başlığı sunucuda kelimelere böler: her kelime kendi maskesinin içinde,
 * PageMotion [data-split] başlıklarda onları sırayla alttan yükseltir.
 * Maskenin üst/alt payı Türkçe aksanları (İ, ş, ğ) kesmesin diye.
 */
export function Words({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="-my-[0.14em] inline-block overflow-hidden py-[0.14em] align-bottom">
            <span data-word="" className="inline-block">
              {word}
            </span>
          </span>
          {/* Boşluk maskenin dışında: inline-block içindeki sondaki boşluk yutulur. */}
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}
