/**
 * Builds an empty payload object that mirrors a layout schema produced by
 * the layout builder (`buildExportJson` shape: `{ [rootKey]: FieldDef[] }`).
 */

import { isHtmlStringVisuallyEmpty } from "./html-string-empty";

export type LayoutFieldDef = {
  type: string;
  key: string;
  fields?: LayoutFieldDef[];
  collectionKey?: string;
  multiple?: boolean;
  /** Optional default from layout schema (leaf fields). */
  default?: unknown;
  /** When true, page editors must fill this field before save (see `validateRequiredLayoutValues`). */
  required?: boolean;
};

function normalizeLinkLeafDefault(
  raw: unknown
): { value: string; href: string; target: string } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const target = String(o.target ?? "_self").trim() || "_self";
    return {
      value: String(o.value ?? ""),
      href: String(o.href ?? ""),
      target,
    };
  }
  return { value: "", href: "", target: "_self" };
}

function emptyLeafValue(type: string): unknown {
  switch (type) {
    case "boolean":
      return false;
    case "number":
      return 0;
    case "link":
      return { value: "", href: "", target: "_self" };
    case "collection_ref":
      return "";
    case "title":
    case "description":
    case "textarea":
    case "badge":
    case "image":
    case "file":
    case "icon":
    case "url":
    case "date":
    default:
      return "";
  }
}

/** Uses schema `default` when set; otherwise type empty placeholder. */
function leafValueFromDef(def: LayoutFieldDef): unknown {
  if (def.type === "collection_ref") {
    return def.multiple === false ? "" : [];
  }
  if (def.default !== undefined) {
    return normalizeLeafDefault(def.type, def.default);
  }
  return emptyLeafValue(def.type);
}

function normalizeLeafDefault(type: string, raw: unknown): unknown {
  switch (type) {
    case "boolean":
      if (typeof raw === "boolean") return raw;
      if (raw === "true" || raw === 1) return true;
      if (raw === "false" || raw === 0) return false;
      return false;
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case "link":
      return normalizeLinkLeafDefault(raw);
    case "collection_ref":
      if (Array.isArray(raw)) {
        return raw
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter(Boolean);
      }
      return raw == null ? "" : String(raw);
    case "title":
    case "description":
    case "textarea":
    case "badge":
    case "image":
    case "file":
    case "icon":
    case "url":
    case "date":
    default:
      return raw == null ? "" : String(raw);
  }
}

/** Link field keys reserved when flattening a single link onto an array item object. */
const FLAT_LINK_RESERVED_KEYS = new Set(["value", "href", "target"]);

/**
 * When an array item defines exactly one `link` and no other field uses `value` / `href` / `target`
 * as its key, stored items are `{ value, href, target, ... }` instead of `{ link: { ... } }`.
 */
export function shouldFlattenArrayItemLinks(defs: LayoutFieldDef[]): boolean {
  const links = defs.filter((d) => d.type === "link");
  if (links.length !== 1) return false;
  for (const d of defs) {
    if (d.type === "link") continue;
    const k = d.key?.trim();
    if (k && FLAT_LINK_RESERVED_KEYS.has(k)) return false;
  }
  return true;
}

function valuesFromFieldDefs(
  defs: LayoutFieldDef[],
  options?: { parentIsArrayItemFields?: boolean }
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const inArrayItem = options?.parentIsArrayItemFields === true;
  const flattenLink = inArrayItem && shouldFlattenArrayItemLinks(defs);

  for (const def of defs) {
    const key = def.key?.trim();
    if (!key) continue;
    const t = def.type;
    if (t === "array") {
      const fields = def.fields ?? [];
      const item = valuesFromFieldDefs(fields, {
        parentIsArrayItemFields: true,
      });
      out[key] = [item];
      continue;
    }
    if (t === "object") {
      const fields = def.fields ?? [];
      out[key] = valuesFromFieldDefs(fields, {
        parentIsArrayItemFields: false,
      });
      continue;
    }
    if (inArrayItem && t === "link" && flattenLink) {
      const lv = leafValueFromDef(def) as Record<string, unknown>;
      Object.assign(out, lv);
      continue;
    }
    out[key] = leafValueFromDef(def);
  }
  return out;
}

export function parseFieldDefs(raw: unknown): LayoutFieldDef[] {
  if (!Array.isArray(raw)) return [];
  const out: LayoutFieldDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const type = String(o.type ?? "");
    const key = String(o.key ?? "");
    const fieldsRaw = o.fields;
    const fields = Array.isArray(fieldsRaw)
      ? parseFieldDefs(fieldsRaw)
      : undefined;
    const def: LayoutFieldDef = { type, key, fields };
    if (typeof o.collectionKey === "string" && o.collectionKey.trim()) {
      def.collectionKey = o.collectionKey.trim();
    }
    if (typeof o.multiple === "boolean") {
      def.multiple = o.multiple;
    }
    if (Object.prototype.hasOwnProperty.call(o, "default")) {
      def.default = o.default;
    }
    if (o.required === true) {
      def.required = true;
    }
    out.push(def);
  }
  return out;
}

/**
 * Returns a payload shaped as `{ [rootKey]: { ...values matching schema keys } }`.
 */
export function buildPayloadTemplateFromSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const rootKeys = Object.keys(schema);
  if (rootKeys.length === 0) return {};
  const rootKey = rootKeys[0];
  const root = schema[rootKey];
  const defs = parseFieldDefs(root);
  return { [rootKey]: valuesFromFieldDefs(defs) };
}

export function parseLayoutSchema(
  schema: Record<string, unknown>,
  preferredRootKey?: string
): {
  rootKey: string;
  defs: LayoutFieldDef[];
} {
  const rootKeys = Object.keys(schema);
  if (rootKeys.length === 0) {
    return { rootKey: preferredRootKey ?? "section", defs: [] };
  }
  const rootKey =
    preferredRootKey && rootKeys.includes(preferredRootKey)
      ? preferredRootKey
      : rootKeys[0];
  const root = schema[rootKey];
  return { rootKey, defs: parseFieldDefs(root) };
}

const VALID_SECTION_BLOCK_TYPES = new Set<string>([
  "title",
  "description",
  "textarea",
  "badge",
  "image",
  "file",
  "icon",
  "number",
  "boolean",
  "url",
  "date",
  "link",
  "collection_ref",
  "array",
  "object",
]);

function isFullSchemaShape(obj: unknown): obj is Record<string, unknown> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length === 0) return false;
  const firstVal = o[keys[0]];
  return Array.isArray(firstVal);
}

function isSingleFieldDef(obj: unknown): obj is Record<string, unknown> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.type === "string" &&
    o.type.length > 0 &&
    typeof o.key === "string" &&
    o.key.length > 0
  );
}

function filterValidFieldDefs(
  defs: LayoutFieldDef[],
  out: { skipped: number }
): LayoutFieldDef[] {
  return defs
    .filter((def) => {
      if (VALID_SECTION_BLOCK_TYPES.has(def.type)) return true;
      out.skipped += 1;
      return false;
    })
    .map((def) => {
      if (def.type === "array" || def.type === "object") {
        const nested = filterValidFieldDefs(def.fields ?? [], out);
        return { ...def, fields: nested };
      }
      return def;
    });
}

/**
 * Parses JSON input that may be in one of these formats:
 * - Full schema: `{ "section": [ {...}, {...} ] }` or `{ "footer_links": [ {...} ] }`
 * - Array of field defs: `[ {...}, {...} ]`
 * - Single field def: `{ "type": "array", "key": "footer_links", "fields": [...] }`
 *
 * @returns `{ rootKey, defs, skipped }` for use with layoutFieldDefsToHydratedBlocks. `skipped` is the count of defs with invalid types that were filtered out.
 * @throws Error when JSON is invalid or structure is unrecognized
 */
export function parseJsonInputToLayoutDefs(
  jsonString: string,
  currentRootKey: string
): { rootKey: string; defs: LayoutFieldDef[]; skipped: number } {
  const trimmed = jsonString.trim();
  if (!trimmed) {
    return { rootKey: currentRootKey || "section", defs: [], skipped: 0 };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Invalid JSON. Check syntax and try again.");
  }
  let result: { rootKey: string; defs: LayoutFieldDef[] };
  if (Array.isArray(parsed)) {
    const defs = parseFieldDefs(parsed);
    result = { rootKey: currentRootKey || "section", defs };
  } else if (isFullSchemaShape(parsed)) {
    result = parseLayoutSchema(
      parsed as Record<string, unknown>,
      currentRootKey
    );
  } else if (isSingleFieldDef(parsed)) {
    const defs = parseFieldDefs([parsed]);
    result = { rootKey: currentRootKey || "section", defs };
  } else {
    throw new Error(
      "Unrecognized format. Use full schema { \"section\": [...] }, an array of field defs, or a single field def with type, key, and fields."
    );
  }
  const skipped = { skipped: 0 };
  const defs = filterValidFieldDefs(result.defs, skipped);
  return {
    rootKey: result.rootKey,
    defs,
    skipped: skipped.skipped,
  };
}

/** Matches the layout builder tree (`SectionBlock`) after hydration from saved schema. */
export interface HydratedLayoutBuilderBlock {
  id: string;
  type: string;
  key: string;
  children: HydratedLayoutBuilderBlock[];
  defaultStr?: string;
  /** Present when `type` is `link` (composite default in schema JSON). */
  defaultLink?: { value: string; href: string; target: string };
  collectionKey?: string;
  multiple?: boolean;
  required?: boolean;
}

function leafDefaultToBuilderString(
  type: string,
  raw: unknown
): string | undefined {
  if (raw === undefined) return undefined;
  if (type === "link") return undefined;
  if (type === "boolean") {
    if (typeof raw === "boolean") return raw ? "true" : "false";
    if (raw === "true" || raw === "false") return raw;
    return undefined;
  }
  if (type === "number") {
    if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
    const n = Number(raw);
    return Number.isFinite(n) ? String(n) : undefined;
  }
  return raw == null ? undefined : String(raw);
}

export function layoutFieldDefsToHydratedBlocks(
  defs: LayoutFieldDef[]
): HydratedLayoutBuilderBlock[] {
  return defs.map((def) => {
    const id = crypto.randomUUID();
    const required = def.required === true;
    if (def.type === "array" || def.type === "object") {
      return {
        id,
        type: def.type,
        key: def.key,
        children: layoutFieldDefsToHydratedBlocks(def.fields ?? []),
        required,
      };
    }
    if (def.type === "link") {
      const dl = normalizeLinkLeafDefault(def.default);
      return {
        id,
        type: def.type,
        key: def.key,
        children: [],
        defaultLink: dl,
        required,
      };
    }
    if (def.type === "collection_ref") {
      return {
        id,
        type: def.type,
        key: def.key,
        children: [],
        collectionKey: def.collectionKey?.trim() || "testimonials",
        multiple: def.multiple !== false,
        required,
      };
    }
    return {
      id,
      type: def.type,
      key: def.key,
      children: [],
      defaultStr: leafDefaultToBuilderString(def.type, def.default),
      required,
    };
  });
}

function isLeafValueEmpty(type: string, value: unknown): boolean {
  switch (type) {
    case "boolean":
      return false;
    case "number": {
      if (value === undefined || value === null) return true;
      if (typeof value === "number") return !Number.isFinite(value);
      if (typeof value === "string") {
        const t = value.trim();
        return t === "" || !Number.isFinite(Number(t));
      }
      return true;
    }
    case "link": {
      const o = normalizeLinkLeafDefault(value);
      return o.value.trim() === "" && o.href.trim() === "";
    }
    case "collection_ref": {
      if (Array.isArray(value)) {
        const validIds = value.filter(
          (v): v is string => typeof v === "string" && v.trim() !== ""
        );
        return validIds.length === 0;
      }
      if (value === undefined || value === null) return true;
      return String(value).trim() === "";
    }
    case "description":
      if (value === undefined || value === null) return true;
      if (typeof value === "string") return isHtmlStringVisuallyEmpty(value);
      return String(value).trim() === "";
    case "title":
    case "textarea":
    case "badge":
    case "image":
    case "icon":
    case "url":
    case "date":
    default:
      if (value === undefined || value === null) return true;
      if (typeof value === "string") return value.trim() === "";
      return String(value).trim() === "";
  }
}

function isLinkLikeObject(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return "value" in o || "href" in o;
}

function resolveLeafValueForValidation(
  def: LayoutFieldDef,
  obj: Record<string, unknown>,
  arrayItemFlattenLinks: boolean
): unknown {
  if (def.type !== "link" || !arrayItemFlattenLinks) {
    return obj[def.key.trim()];
  }
  const key = def.key.trim();
  const nested = obj[key];
  if (isLinkLikeObject(nested)) return nested;
  return obj;
}

function validateDefsRecursive(
  defs: LayoutFieldDef[],
  obj: Record<string, unknown>,
  pathParts: string[],
  options?: { parentArrayItemFlattenLinks?: boolean }
): string | null {
  const arrayItemFlattenLinks =
    options?.parentArrayItemFlattenLinks === true &&
    shouldFlattenArrayItemLinks(defs);

  for (const def of defs) {
    const key = def.key?.trim();
    if (!key) continue;
    const fieldPath = [...pathParts, key].join(".");

    if (def.type === "object") {
      const sub = obj[key];
      if (def.required) {
        if (
          sub === undefined ||
          sub === null ||
          typeof sub !== "object" ||
          Array.isArray(sub)
        ) {
          return `Field "${fieldPath}" is required.`;
        }
      }
      if (
        sub !== undefined &&
        sub !== null &&
        typeof sub === "object" &&
        !Array.isArray(sub)
      ) {
        const err = validateDefsRecursive(
          def.fields ?? [],
          sub as Record<string, unknown>,
          [...pathParts, key]
        );
        if (err) return err;
      }
      continue;
    }

    if (def.type === "array") {
      const arr = obj[key];
      if (def.required) {
        if (!Array.isArray(arr) || arr.length === 0) {
          return `Field "${fieldPath}" is required (add at least one item).`;
        }
      }
      if (Array.isArray(arr)) {
        const itemFlatten = shouldFlattenArrayItemLinks(def.fields ?? []);
        for (let i = 0; i < arr.length; i++) {
          const item = arr[i];
          if (typeof item !== "object" || item === null || Array.isArray(item)) {
            continue;
          }
          const err = validateDefsRecursive(
            def.fields ?? [],
            item as Record<string, unknown>,
            [...pathParts, `${key}[${i}]`],
            { parentArrayItemFlattenLinks: itemFlatten }
          );
          if (err) return err;
        }
      }
      continue;
    }

    const leafVal = resolveLeafValueForValidation(
      def,
      obj,
      arrayItemFlattenLinks
    );
    if (def.required && isLeafValueEmpty(def.type, leafVal)) {
      return `Field "${fieldPath}" is required.`;
    }
  }
  return null;
}

/**
 * Returns an error message if any field marked `required: true` in the layout
 * schema is missing or empty in `configValues`, or null if valid.
 */
export function validateRequiredLayoutValues(
  rootKey: string,
  defs: LayoutFieldDef[],
  configValues: Record<string, unknown>
): string | null {
  const inner = configValues[rootKey];
  if (
    inner === undefined ||
    inner === null ||
    typeof inner !== "object" ||
    Array.isArray(inner)
  ) {
    const needsSection =
      defs.length > 0 && defs.some((d) => d.required === true);
    if (needsSection) {
      return `Section "${rootKey}" is missing or invalid.`;
    }
    return null;
  }
  return validateDefsRecursive(defs, inner as Record<string, unknown>, [
    rootKey,
  ]);
}

/**
 * Merges a fresh schema template into existing saved config so new fields
 * (e.g. an image added in the layout builder later) appear without wiping data
 * for keys that still exist in the schema.
 *
 * **Keys present in saved config but not in the current template are dropped**
 * (e.g. field renamed `posts` → `test` in the layout builder). The template is
 * the source of truth for which keys belong in stored section JSON.
 */
/**
 * Migrates legacy array items that stored a single link as `{ link: { value, href, target } }`
 * to flat `{ value, href, target }` when the template expects flat link keys.
 */
function tryMigrateNestedLinkKeyToFlat(
  existing: Record<string, unknown>,
  template: Record<string, unknown>
): Record<string, unknown> {
  const linkVal = existing.link;
  if (!isLinkLikeObject(linkVal)) return existing;
  const tplHasFlatLink =
    "value" in template &&
    "href" in template &&
    "target" in template &&
    !Object.prototype.hasOwnProperty.call(template, "link");
  if (!tplHasFlatLink) return existing;
  const next = { ...existing };
  delete next.link;
  const o = normalizeLinkLeafDefault(linkVal);
  return { ...next, ...o };
}

function mergeUnknown(existing: unknown, template: unknown): unknown {
  if (template === null || template === undefined) return existing;
  if (Array.isArray(template)) {
    if (!Array.isArray(existing)) return template;
    if (existing.length === 0) return existing;
    const itemTpl = template[0];
    return existing.map((item) => mergeUnknown(item, itemTpl));
  }
  if (
    typeof template === "object" &&
    template !== null &&
    !Array.isArray(template)
  ) {
    const tpl = template as Record<string, unknown>;
    const ex =
      existing !== null &&
      typeof existing === "object" &&
      !Array.isArray(existing)
        ? tryMigrateNestedLinkKeyToFlat(
            existing as Record<string, unknown>,
            tpl
          )
        : {};
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(tpl)) {
      if (key in ex) {
        out[key] = mergeUnknown(ex[key], tpl[key]);
      } else {
        out[key] = tpl[key];
      }
    }
    return out;
  }
  if (existing !== undefined && existing !== null) return existing;
  return template;
}

export function mergeLayoutPayloadTemplate(
  existing: Record<string, unknown>,
  template: Record<string, unknown>
): Record<string, unknown> {
  return mergeUnknown(existing, template) as Record<string, unknown>;
}

/** One empty row for an array field (same shape as template item). */
export function emptyArrayItemFromFields(
  fields: LayoutFieldDef[] | undefined
): Record<string, unknown> {
  return valuesFromFieldDefs(fields ?? [], {
    parentIsArrayItemFields: true,
  });
}
