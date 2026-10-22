import { llmsFull, llmsResponse } from "@/lib/llms";

// Sitenin tüm metni, düz metin (bkz. lib/llms.ts); build'de bir kez üretilir.
export const dynamic = "force-static";

export function GET() {
  return llmsResponse(llmsFull());
}
