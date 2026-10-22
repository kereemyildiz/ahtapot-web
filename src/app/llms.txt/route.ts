import { llmsResponse, llmsSummary } from "@/lib/llms";

// Yapay zekâ asistanları için özet (bkz. lib/llms.ts); build'de bir kez üretilir.
export const dynamic = "force-static";

export function GET() {
  return llmsResponse(llmsSummary());
}
