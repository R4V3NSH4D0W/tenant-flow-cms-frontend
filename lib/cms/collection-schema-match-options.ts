import type { CmsDynamicRouteMatchRule } from "@/lib/cms/api";

/** Sentinel for "pick manually" in match-rule UI selects. */
export const MATCH_TARGET_CUSTOM = "__custom__";
export const MATCH_PARAM_CUSTOM = "__param_custom__";

export type SchemaMatchOptionGroup = "row" | "payload" | "reference";

export type SchemaMatchOption = {
  group: SchemaMatchOptionGroup;
  kind: "field" | "ref";
  fieldPath: string;
  label: string;
};

const ROW_OPTIONS: SchemaMatchOption[] = [
  { group: "row", kind: "field", fieldPath: "slug", label: "Row · slug" },
  { group: "row", kind: "field", fieldPath: "title", label: "Row · title" },
  { group: "row", kind: "field", fieldPath: "id", label: "Row · id" },
];

function formatKindPath(kind: "field" | "ref", fieldPath: string): string {
  return `${kind}:${fieldPath}`;
}

/** Option value for HTML selects: `field:slug` or `ref:parent.slug`. */
export function schemaMatchOptionValue(option: SchemaMatchOption): string {
  return formatKindPath(option.kind, option.fieldPath);
}

export function parseKindFieldPath(raw: string): {
  kind: "field" | "ref";
  fieldPath: string;
} | null {
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const kind = raw.slice(0, idx) === "ref" ? "ref" : "field";
  const fieldPath = raw.slice(idx + 1).trim();
  if (!fieldPath) return null;
  return { kind, fieldPath };
}

/** Names of `:param` segments in a route pattern (leading `/` optional). */
export function extractPatternParamNames(pattern: string): string[] {
  const trimmed = pattern.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) return [];
  const names: string[] = [];
  for (const seg of trimmed.split("/").filter(Boolean)) {
    if (!seg.startsWith(":")) continue;
    const name = seg.slice(1).trim();
    if (name && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) names.push(name);
  }
  return names;
}

function extractRootFieldNodes(schema: Record<string, unknown>): unknown[] {
  const fields = schema.fields ?? schema.children;
  return Array.isArray(fields) ? fields : [];
}

function walkSchemaNode(
  node: unknown,
  prefix: string,
  out: SchemaMatchOption[],
): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  const n = node as Record<string, unknown>;
  const key = typeof n.key === "string" ? n.key.trim() : "";
  if (!key) return;
  const type = typeof n.type === "string" ? n.type : "";
  const path = prefix ? `${prefix}${key}` : key;

  if (type === "object") {
    const children = (Array.isArray(n.fields) ? n.fields : []) as unknown[];
    for (const child of children) {
      walkSchemaNode(child, `${path}.`, out);
    }
    return;
  }

  if (type === "array") {
    const children = (Array.isArray(n.fields) ? n.fields : []) as unknown[];
    if (children.length > 0) {
      for (const child of children) {
        walkSchemaNode(child, `${path}.`, out);
      }
    } else {
      out.push({
        group: "payload",
        kind: "field",
        fieldPath: path,
        label: `Payload · ${path}`,
      });
    }
    return;
  }

  if (type === "collection_ref") {
    out.push({
      group: "reference",
      kind: "ref",
      fieldPath: `${path}.slug`,
      label: `Reference · ${key} → slug`,
    });
    out.push({
      group: "reference",
      kind: "ref",
      fieldPath: `${path}.title`,
      label: `Reference · ${key} → title`,
    });
    return;
  }

  out.push({
    group: "payload",
    kind: "field",
    fieldPath: path,
    label: `Payload · ${path}`,
  });
}

/**
 * Build dropdown rows for match rules from a collection `schema` document
 * (same shape as the collection builder exports: object root with `fields`).
 */
export function matchFieldOptionsFromCollectionSchema(
  schema: Record<string, unknown> | undefined | null,
): SchemaMatchOption[] {
  const extra: SchemaMatchOption[] = [];
  if (schema && typeof schema === "object" && !Array.isArray(schema)) {
    for (const root of extractRootFieldNodes(schema)) {
      walkSchemaNode(root, "", extra);
    }
  }
  const seen = new Set<string>();
  const out: SchemaMatchOption[] = [];
  for (const o of ROW_OPTIONS) {
    const v = schemaMatchOptionValue(o);
    if (!seen.has(v)) {
      seen.add(v);
      out.push(o);
    }
  }
  for (const o of extra) {
    const v = schemaMatchOptionValue(o);
    if (!seen.has(v)) {
      seen.add(v);
      out.push(o);
    }
  }
  return out;
}

export function matchRulePresetSelectValue(
  rule: CmsDynamicRouteMatchRule,
  options: SchemaMatchOption[],
): string | typeof MATCH_TARGET_CUSTOM {
  const kind = rule.kind === "ref" ? "ref" : "field";
  const fp = (rule.fieldPath ?? "").trim();
  const candidate = formatKindPath(kind, fp);
  if (options.some((o) => schemaMatchOptionValue(o) === candidate)) {
    return candidate;
  }
  return MATCH_TARGET_CUSTOM;
}
