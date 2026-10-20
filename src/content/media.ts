import mediaRaw from "../../content/media.json";
import { mediaSchema, type MediaImage } from "./schema";

const media = mediaSchema.parse(mediaRaw);

export function getMedia() {
  return media;
}

/** media.json'daki bir görsel anahtarını çözer; yoksa build'i kırar. */
export function getImage(key: string): MediaImage {
  const image = media.images[key];
  if (!image) {
    throw new Error(`content/media.json: "${key}" adlı görsel tanımlı değil`);
  }
  return image;
}
