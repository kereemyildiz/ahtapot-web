import { z } from "zod";
import { LAYER_IDS, PRODUCT_LAYERS, type LayerId, type ProductLayer } from "./constants";

// ---------------------------------------------------------------------------
// content/tr.json ve content/en.json şeması.
//
// Bu şema şekli doğruluyor (.strict() fazla anahtarı reddediyor);
// src/content/index.ts'teki assertMatchingKeys iki dil arasındaki anahtar
// farkını yakalıyor. Bir dilde olup diğerinde olmayan anahtar build'i kırar.
//
// Metinler normal case tutulur; büyük harf her zaman CSS ile ve doğru
// `lang` altında uygulanır (Türkçe i→İ buna bağlı).
// ---------------------------------------------------------------------------

export const layerIdSchema = z.enum(LAYER_IDS);
export { LAYER_IDS, PRODUCT_LAYERS, type LayerId, type ProductLayer };

const byLayer = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      mekanik: item,
      elektronik: item,
      gomulu: item,
      uygulama: item,
      saha: item,
    })
    .strict();

const productLayerRecord = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      mekanik: item,
      elektronik: item,
      gomulu: item,
      uygulama: item,
    })
    .strict();

/** Yalnız metin taşıyan, anahtarları sabit bir nesne. */
function strings<K extends string>(keys: readonly K[]) {
  return z
    .object(Object.fromEntries(keys.map((k) => [k, z.string()])) as Record<K, z.ZodString>)
    .strict();
}

const VIEWER_KEYS = [
  "sampleNote", "open", "engage", "engaged", "zoomIn", "zoomOut",
  "home", "fullscreen", "annotations", "objective",
  "toolsLabel", "toolPan", "toolPolygon", "toolRect", "toolRuler",
  "deleteSelected", "clearAll", "hintPan", "hintPolygon", "hintRect",
  "hintRuler", "measureNote",
] as const;

const SIMULATOR_KEYS = [
  "powerButton", "lightButton", "on", "off", "setpoint", "actual", "heater",
  "decrease", "increase", "setKey", "presets", "presetLowMelt", "presetHighMelt",
  "presetFatty", "light", "water", "waterOk", "waterLow", "explode", "assemble",
  "statusOff", "statusHeating", "statusHolding", "statusCooling", "statusInterlock",
  "section", "sectionWrinkled", "sectionOpening", "sectionFlat", "sectionTooHot",
  "sectionNone", "slideTake", "slideRefill", "slideFlat", "slideWrinkled", "slideTooHot",
  "chartTitle", "chartTemp", "chartSet", "panelHint", "panelHintSlides", "disclaimer",
] as const;

const requestTypeRecord = z
  .object({
    urunBilgisi: z.string(),
    demo: z.string(),
    distributorluk: z.string(),
    isBasvurusu: z.string(),
    diger: z.string(),
  })
  .strict();

const productCopySchema = z
  .object({
    name: z.string(),
    tagline: z.string(),
    // TODO(mock-data): gerçek spesifikasyon değil, nitel özellikler.
    description: z.string(),
    features: z.array(z.string()),
    // assets.gallery ile aynı sırada, görsel başına bir açıklama.
    screens: z.array(z.string()),
    // assets.compare varsa: mikroskop ↔ dijital karşılaştırmasının metinleri.
    compare: z
      .object({
        heading: z.string(),
        caption: z.string(),
        microscopeLabel: z.string(),
        digitalLabel: z.string(),
        microscopeAlt: z.string(),
        digitalAlt: z.string(),
        handle: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();

const legalPageSchema = z
  .object({
    title: z.string(),
    legalReviewNote: z.string(),
    body: z.array(z.string()),
  })
  .strict();

export const localeContentSchema = z
  .object({
    meta: z.object({ siteTitle: z.string(), siteDescription: z.string() }).strict(),
    company: z
      .object({
        legalName: z.string(),
        shortName: z.string(),
        // Logoda "Ahtapot" yazısının altındaki küçük satır.
        brandSub: z.string(),
        address: z.string(),
        // TODO: gerçek e-posta / telefon — boşsa render edilmez.
        email: z.string(),
        phone: z.string(),
      })
      .strict(),
    nav: z
      .object({
        kabiliyet: z.string(),
        urunler: z.string(),
        hakkimizda: z.string(),
        iletisim: z.string(),
        cta: z.string(),
        menu: z.string(),
        close: z.string(),
        skip: z.string(),
        home: z.string(),
        localeLabel: z.string(),
        localeName: z.string(),
        themeToLight: z.string(),
        themeToDark: z.string(),
        navLabel: z.string(),
      })
      .strict(),
    hero: z
      .object({
        title: z.string(),
        lead: z.string(),
        primaryCta: z.string(),
        secondaryCta: z.string(),
        visualAlt: z.string(),
        callouts: productLayerRecord(z.string()),
      })
      .strict(),
    layers: byLayer(z.string()),
    capability: z
      .object({
        heading: z.string(),
        progressLabel: z.string(),
        // Sahnelerdeki araç arayüzlerinin (CAD, PCB, IDE, saha) etiketleri.
        visuals: z
          .object({
            cad: z
              .object({ tree: z.string(), parts: z.array(z.string()), commands: z.array(z.string()), units: z.string(), view: z.string() })
              .strict(),
            pcb: z
              .object({
                layers: z.string(),
                layerNames: z.array(z.string()),
                nets: z.array(z.string()),
                net: z.string(),
                drc: z.string(),
                drcRunning: z.string(),
                board: z.string(),
              })
              .strict(),
            ide: z
              .object({
                files: z.array(z.string()),
                watch: z.string(),
                terminal: z.string(),
                plot: z.string(),
                build: z.string(),
                flash: z.string(),
                running: z.string(),
                ok: z.string(),
              })
              .strict(),
            field: z
              .object({
                center: z.string(),
                devices: z.array(z.string()),
                online: z.string(),
                installing: z.string(),
                installed: z.string(),
                training: z.string(),
                trained: z.string(),
                calibrating: z.string(),
                calibrated: z.string(),
                updating: z.string(),
                updated: z.string(),
              })
              .strict(),
          })
          .strict(),
        items: byLayer(
          z
            .object({
              title: z.string(),
              sentence: z.string(),
              // TODO(mock-data): genel yetkinlik başlıkları, onay bekliyor.
              deliverables: z.array(z.string()),
              caption: z.string(),
              alt: z.string(),
            })
            .strict()
        ),
      })
      .strict(),
    // Ürüne özel olmayan, paylaşılan ürün arayüzü metinleri.
    product: z
      .object({
        heading: z.string(),
        intro: z.string(),
        statusAvailable: z.string(),
        // Bu rozet gizlenemez, küçültülemez, opsiyonel değildir.
        inDevelopmentBadge: z.string(),
        layersLabel: z.string(),
        detailsCta: z.string(),
        quoteCta: z.string(),
        demoCta: z.string(),
        dragHint: z.string(),
        featuresHeading: z.string(),
        backToProducts: z.string(),
        screensHeading: z.string(),
        modelAlt: z.string(),
        viewer: strings(VIEWER_KEYS),
        simulator: strings(SIMULATOR_KEYS),
      })
      .strict(),
    // slug -> ürün metni. Yapısal alanlar content/products/*.json'da.
    products: z.record(z.string(), productCopySchema),
    about: z
      .object({
        heading: z.string(),
        lead: z.string(),
        body: z.string(),
        facts: z.array(z.object({ label: z.string(), value: z.string() }).strict()),
        pillars: z.array(z.object({ title: z.string(), text: z.string() }).strict()),
        founder: z
          .object({
            label: z.string(),
            name: z.string(),
            role: z.string(),
            bio: z.string(),
            areas: z.array(z.string()),
          })
          .strict(),
      })
      .strict(),
    contact: z
      .object({
        heading: z.string(),
        promptLine1: z.string(),
        promptLine2: z.string(),
        next: z.string(),
        detailsHeading: z.string(),
        addressLabel: z.string(),
        emailLabel: z.string(),
        phoneLabel: z.string(),
        fields: z
          .object({
            name: z.string(),
            email: z.string(),
            organization: z.string(),
            requestType: z.string(),
            message: z.string(),
          })
          .strict(),
        requestTypes: requestTypeRecord,
        // Buton metni ne olacağını söyler; konuya göre değişir.
        submitByType: requestTypeRecord,
        consent: z.object({ label: z.string(), linkText: z.string() }).strict(),
        submitting: z.string(),
        success: z.object({ title: z.string(), body: z.string() }).strict(),
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
    footer: z
      .object({
        tagline: z.string(),
        kvkk: z.string(),
        privacy: z.string(),
        credits: z.string(),
        backToTop: z.string(),
      })
      .strict(),
    // Açık lisanslı fotoğrafların atıf sayfası (footer'dan bağlantı).
    credits: z.object({ title: z.string(), intro: z.string() }).strict(),
    kvkk: legalPageSchema,
    privacy: legalPageSchema,
  })
  .strict();

export type LocaleContent = z.infer<typeof localeContentSchema>;

// ---------------------------------------------------------------------------
// content/media.json — dilden bağımsız görsel varlıkları. Alt metinler dil
// dosyalarında.
// ---------------------------------------------------------------------------

const imageSchema = z
  .object({
    src: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    // Mikroskopi görüntülerinde bir pikselin fiziksel boyutu (ölçek çubuğu için).
    umPerPx: z.number().positive().optional(),
  })
  .strict();
export type MediaImage = z.infer<typeof imageSchema>;

export const mediaSchema = z
  .object({
    images: z.record(z.string(), imageSchema),
    // Tek görsel ya da ekran görüntüsü dizisi (dizi → üst üste pencereler).
    capability: byLayer(z.union([z.string(), z.array(z.string())]).nullable()),
    credits: z.array(
      z
        .object({
          title: z.string(),
          creator: z.string().nullable(),
          license: z.string(),
          licenseUrl: z.string(),
          page: z.string(),
          via: z.string(),
        })
        .strict()
    ),
  })
  .strict();
export type Media = z.infer<typeof mediaSchema>;

// ---------------------------------------------------------------------------
// content/products/*.json şeması
// ---------------------------------------------------------------------------

export const productStatusSchema = z.enum(["available", "in-development"]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

// `interaction` bilinçli olarak gevşek: bilinmeyen değer build'i kırmaz,
// render katmanında gallery'ye düşer.
export const productInteractionSchema = z.string();
export type ProductInteraction = "simulator" | "turntable" | "deepzoom" | "gallery";

export const productLayerSchema = z.enum(PRODUCT_LAYERS);

const productAssetsSchema = z
  .object({
    // Ek ekran görüntüleri; açıklamaları products.<slug>.screens'te aynı sırada.
    gallery: z.array(imageSchema),
    turntable: z
      .object({
        // Gerçek 360° fotoğraf kareleri geldiğinde: framesPath + frameCount.
        framesPath: z.string().optional(),
        frameCount: z.number().int().positive().optional(),
        // Kare yokken kullanılan çizim modeli (bkz. components/device).
        model: z.string().optional(),
      })
      .strict()
      .optional(),
    // Çalışma prensibini gösteren etkileşimli simülasyon. `kind` hangi fizik
    // modelinin ve çizimin kullanılacağını seçer (bkz. products/simulator).
    // TODO(mock-data): params gerçek ürün değerleri değil, temsili.
    simulator: z
      .object({
        kind: z.string(),
        model: z.string(),
        params: z.record(z.string(), z.number()),
        // Hazır ayar: sıcaklık + simülatör metinlerindeki etiket anahtarı.
        presets: z.array(z.object({ setC: z.number(), label: z.string() }).strict()),
        // Gerçek CAD modeli (tools/cad ile SolidWorks montajından üretilir).
        // Verilirse simülatör WebGL'de bu modeli gösterir; WebGL yoksa çizim modeline düşer.
        model3d: z
          .object({
            src: z.string(),
            anchors: z.string(),
            parts: z.array(
              z
                .object({
                  // Parçanın web kimliğinde geçen metin (tools/cad → WEB_PARTS; ör. "govde", "dugme")
                  match: z.string(),
                  color: z.string().regex(/^#[0-9a-f]{6}$/i),
                  finish: z.enum(["paint", "metal", "plastic", "teflon", "glass", "rubber"]).default("paint"),
                  layer: z.enum(PRODUCT_LAYERS).optional(),
                  // "İçini gösterin"de parçanın kayacağı yön ve mesafe (m, Y yukarı)
                  explode: z.tuple([z.number(), z.number(), z.number()]).optional(),
                  role: z.enum(["controller", "button", "ledGlass", "heater", "container"]).optional(),
                })
                .strict()
            ),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    deepzoom: z
      .object({
        dziPath: z.string(),
        posterPath: z.string(),
        // Gerçek slayt metadata'sı (openslide ile okundu).
        nativeObjective: z.number().positive(),
        nativeMpp: z.number().positive(),
      })
      .strict()
      .optional(),
    // Mikroskop (oküler) ↔ dijital slayt karşılaştırması: aynı kesitin
    // küçük bir görüntüsü ve gerçek piksel boyutu (ölçek çubuğu için).
    compare: imageSchema.optional(),
  })
  .strict();

export const productSchema = z
  .object({
    slug: z.string(),
    order: z.number(),
    status: productStatusSchema,
    interaction: productInteractionSchema,
    layers: z.array(productLayerSchema).min(1),
    assets: productAssetsSchema,
  })
  .strict();

export type Product = z.infer<typeof productSchema>;
