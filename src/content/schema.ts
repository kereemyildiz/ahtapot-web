import { z } from "zod";

// ---------------------------------------------------------------------------
// content/tr.json ve content/en.json şeması.
//
// Kural (CLAUDE.md): "bir dilde olup diğerinde olmayan anahtar build'i
// kırmalı". Bu şema hem şekli/tipleri doğruluyor (zod .strict() ile fazla
// anahtarı reddediyor), hem de src/content/index.ts'teki assertMatchingKeys
// iki dosya arasında anahtar kümesini derinlemesine karşılaştırıyor — bu
// ikincisi özellikle `products` gibi record tipli alanlarda (zod tek başına
// "tr'de var, en'de yok" gibi bir slug farkını yakalamaz) gerekli.
//
// Not: metinler burada normal case tutuluyor. UPPERCASE her zaman CSS
// (text-transform: uppercase) ile ve doğru `lang` altında uygulanıyor —
// Türkçe i→İ dönüşümü buna bağlı, JSON içine büyük harf yazmıyoruz.
// ---------------------------------------------------------------------------

const layerLabelsSchema = z
  .object({
    mekanik: z.string(),
    elektronik: z.string(),
    gomulu: z.string(),
    uygulama: z.string(),
    saha: z.string(),
  })
  .strict();

const layerSentencesSchema = z
  .object({
    mekanik: z.string(),
    elektronik: z.string(),
    gomulu: z.string(),
    uygulama: z.string(),
    saha: z.string(),
  })
  .strict();

const sectionLabelsSchema = z
  .object({
    katmanlar: z.string(),
    urunler: z.string(),
    hakkimizda: z.string(),
    ekip: z.string(),
    referanslar: z.string(),
    kariyer: z.string(),
    iletisim: z.string(),
  })
  .strict();

const productCopySchema = z
  .object({
    name: z.string(),
    tagline: z.string(),
    // Detay sayfası için (/urunler/[slug]) — TODO(mock-data): gerçek
    // spesifikasyon değil, ekran görüntülerinden/gerçek çerçeveden
    // türetilmiş nitel özellikler. Bkz. docs/mock-data-todo.md.
    description: z.string(),
    features: z.array(z.string()),
  })
  .strict();

export const localeContentSchema = z
  .object({
    meta: z
      .object({
        siteTitle: z.string(),
        siteDescription: z.string(),
      })
      .strict(),
    // Gerçek şirket bilgisi (kullanıcı verdi) — İletişim/KVKK için.
    company: z
      .object({
        legalName: z.string(),
        address: z.string(),
      })
      .strict(),
    nav: z
      .object({
        layers: layerLabelsSchema,
        sections: sectionLabelsSchema,
      })
      .strict(),
    // Katmanlar bölümünde her katman için tek cümle (spec: "jenerik
    // infografik yapma, çizgiden türet" — görsel yok, yalnız etiket + cümle).
    layerSentences: layerSentencesSchema,
    hero: z
      .object({
        eyebrow: z.string(),
        heading: z.string(),
      })
      .strict(),
    theme: z
      .object({
        light: z.string(),
        dark: z.string(),
        toggleLabel: z.string(),
      })
      .strict(),
    locale: z
      .object({
        tr: z.string(),
        en: z.string(),
        switchLabel: z.string(),
      })
      .strict(),
    // Ürüne özel olmayan, paylaşılan ürün-arayüzü metinleri.
    product: z
      .object({
        // CLAUDE.md: bu rozet gizlenemez, küçültülemez, opsiyonel değildir.
        inDevelopmentBadge: z.string(),
        detailsCta: z.string(),
        backToProducts: z.string(),
      })
      .strict(),
    // slug -> ürün metni. Yapısal alanlar (order/status/interaction/layers/
    // assets) burada değil, content/products/*.json'da — bkz. productSchema.
    products: z.record(z.string(), productCopySchema),
    about: z
      .object({
        paragraph: z.string(),
      })
      .strict(),
    // TODO(mock-data): gerçek isim/fotoğraf yok — bkz. docs/mock-data-todo.md.
    team: z
      .object({
        intro: z.string(),
        members: z.array(
          z
            .object({
              name: z.string(),
              role: z.string(),
              bio: z.string(),
            })
            .strict()
        ),
      })
      .strict(),
    career: z
      .object({
        message: z.string(),
        contactCta: z.string(),
      })
      .strict(),
    contact: z
      .object({
        intro: z.string(),
        fields: z
          .object({
            name: z.string(),
            email: z.string(),
            organization: z.string(),
            requestType: z.string(),
            message: z.string(),
          })
          .strict(),
        requestTypes: z
          .object({
            urunBilgisi: z.string(),
            distributorluk: z.string(),
            demo: z.string(),
            isBasvurusu: z.string(),
            diger: z.string(),
          })
          .strict(),
        consent: z
          .object({
            label: z.string(),
            linkText: z.string(),
          })
          .strict(),
        submit: z.string(),
        submitting: z.string(),
        success: z
          .object({
            title: z.string(),
            body: z.string(),
          })
          .strict(),
        errors: z
          .object({
            nameRequired: z.string(),
            emailRequired: z.string(),
            emailInvalid: z.string(),
            messageRequired: z.string(),
            messageTooShort: z.string(),
            consentRequired: z.string(),
            rateLimited: z.string(),
            sendFailed: z.string(),
            generic: z.string(),
          })
          .strict(),
      })
      .strict(),
    kvkk: z
      .object({
        title: z.string(),
        legalReviewNote: z.string(),
        body: z.array(z.string()),
      })
      .strict(),
    privacy: z
      .object({
        title: z.string(),
        legalReviewNote: z.string(),
        body: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export type LocaleContent = z.infer<typeof localeContentSchema>;

// ---------------------------------------------------------------------------
// content/products/*.json şeması
// ---------------------------------------------------------------------------

export const productStatusSchema = z.enum(["available", "in-development"]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

// `interaction` bilinçli olarak gevşek: bilinmeyen bir değer build'i
// kırmamalı, render katmanında gallery'ye düşmeli (CLAUDE.md). Bileşen
// seçimi için kullanılan daraltılmış tip ayrıca aşağıda tanımlı.
export const productInteractionSchema = z.string();
export type ProductInteraction = "turntable" | "deepzoom" | "gallery";

export const productLayerSchema = z.enum([
  "mekanik",
  "elektronik",
  "gomulu",
  "uygulama",
]);
export type ProductLayer = z.infer<typeof productLayerSchema>;

const imageAssetSchema = z
  .object({
    src: z.string(),
    alt: z.string(),
  })
  .strict();

const productAssetsSchema = z
  .object({
    gallery: z.array(imageAssetSchema),
    turntable: z
      .object({
        framesPath: z.string(),
        frameCount: z.number().int().positive(),
      })
      .strict()
      .optional(),
    deepzoom: z
      .object({
        dziPath: z.string(),
        // Gerçek slayt metadata'sı (openslide ile okundu) — mono
        // büyütme etiketi bundan canlı hesaplanıyor, uydurma değil.
        nativeObjective: z.number().positive(),
        nativeMpp: z.number().positive(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const productSchema = z
  .object({
    slug: z.string(),
    order: z.number(),
    status: productStatusSchema,
    interaction: productInteractionSchema,
    layers: z.array(productLayerSchema).min(1),
    // Öne çıkarma diziden değil buradan türer (bkz. spec §3).
    featured: z.boolean().optional(),
    assets: productAssetsSchema,
  })
  .strict();

export type Product = z.infer<typeof productSchema>;
