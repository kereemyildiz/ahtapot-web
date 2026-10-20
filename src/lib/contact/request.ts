import type { RequestType } from "./validate";

export const CONTACT_EVENT = "ahtapot:contact";

/** Sayfadaki iletişim formuna konu seçtirir (form bu olayı dinler). */
export function selectContactType(type: RequestType) {
  window.dispatchEvent(new CustomEvent<RequestType>(CONTACT_EVENT, { detail: type }));
}
