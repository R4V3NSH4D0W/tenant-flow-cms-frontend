import type { SchemaMatchOption } from "@/lib/cms/collection-schema-match-options";

/**
 * Maps a schema match option to the **query parameter name** used on
 * `GET /api/v1/collections/:key` (see `field.*`, `ref.*`, and dedicated `slug`).
 */
export function collectionFilterQueryKeyFromOption(o: SchemaMatchOption): string {
  if (o.kind === "ref") {
    return `ref.${o.fieldPath}`;
  }
  if (o.group === "row" && o.fieldPath === "slug") {
    return "slug";
  }
  return `field.${o.fieldPath}`;
}

/**
 * Query string for a **single-field lookup** only (no `limit` / `offset`).
 * Your storefront can append pagination if needed; the API defaults still apply.
 */
export function buildPublicCollectionLookupQuery(
  lookupKey: string,
  sampleValue: string,
): string {
  const v = sampleValue.trim();
  if (!v) return "";
  return new URLSearchParams({ [lookupKey]: v }).toString();
}
