import { skribblSchema } from "@/lib/structured-data";

/** JSON-LD for the Skribbl landing page. */
export function SeoSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(skribblSchema()) }}
    />
  );
}
