import { arrayMove } from "@dnd-kit/sortable";
import type { IconType } from "react-icons";
import {
  FiBox,
  FiCalendar,
  FiCode,
  FiDatabase,
  FiDroplet,
  FiExternalLink,
  FiFeather,
  FiFile,
  FiFileText,
  FiHash,
  FiImage,
  FiLink2,
  FiList,
  FiMessageSquare,
  FiTag,
  FiToggleLeft,
  FiType,
} from "react-icons/fi";

export type SectionBlockType =
  | "title"
  | "description"
  | "textarea"
  | "badge"
  | "image"
  | "icon_image"
  | "svgcode"
  | "file"
  | "icon"
  | "color"
  | "number"
  | "boolean"
  | "url"
  | "date"
  | "link"
  | "collection_ref"
  | "array"
  | "object"
  | "json";

export interface SectionBlock {
  id: string;
  type: SectionBlockType;
  /** API / JSON field name (camelCase) */
  key: string;
  /** Shape for `array` or `object` */
  children: SectionBlock[];
  /**
   * Optional default for leaf fields only; exported as `default` in schema JSON.
   * Boolean uses `"true"` / `"false"`; number and text use string inputs.
   */
  defaultStr?: string;
  /**
   * When `type` is `link`, optional preset `{ value, href, target }` exported as `default`.
   */
  defaultLink?: { value: string; href: string; target: string };
  /** Collection key used by `collection_ref` fields. */
  collectionKey?: string;
  /** For `collection_ref`: true => array of ids, false => single id. */
  multiple?: boolean;
  /** When true, exported as `required: true` in schema JSON (editors must fill before save). */
  required?: boolean;
}

export interface SectionTool {
  id: SectionBlockType;
  name: string;
  description: string;
  /** Field-type glyph — from `react-icons` (Feather set) to match Next.js dashboard patterns. */
  icon: IconType;
  group: "content" | "primitive" | "structure";
}

export interface CustomToolTemplateNode {
  type?: SectionBlockType;
  key?: string;
  fields?: CustomToolTemplateNode[];
  children?: CustomToolTemplateNode[];
  defaultStr?: string;
  defaultLink?: { value?: string; href?: string; target?: string };
  collectionKey?: string;
  multiple?: boolean;
  required?: boolean;
}

export const SECTION_TOOLS: SectionTool[] = [
  {
    id: "title",
    name: "Title",
    description: "Short heading / label",
    icon: FiType,
    group: "content",
  },
  {
    id: "description",
    name: "Description",
    description: "Rich HTML body (headings, lists, links)",
    icon: FiFileText,
    group: "content",
  },
  {
    id: "textarea",
    name: "Text area",
    description: "Plain multi-line text (no HTML)",
    icon: FiMessageSquare,
    group: "content",
  },
  {
    id: "badge",
    name: "Badge",
    description: "Short label (e.g. tag or pill text)",
    icon: FiTag,
    group: "content",
  },
  {
    id: "link",
    name: "Link",
    description: "Label, URL, and open target",
    icon: FiExternalLink,
    group: "content",
  },
  {
    id: "collection_ref",
    name: "Collection ref",
    description: "Reference reusable collection items",
    icon: FiDatabase,
    group: "content",
  },
  {
    id: "image",
    name: "Image",
    description: "Image URL or asset ref",
    icon: FiImage,
    group: "content",
  },
  {
    id: "icon_image",
    name: "Icon image",
    description: "Icon image stored in the /icon media folder (PNG, SVG, WebP, ICO)",
    icon: FiImage,
    group: "content",
  },
  {
    id: "svgcode",
    name: "SVG Code",
    description: "Raw XML SVG string pasted directly (e.g. <svg>...</svg>)",
    icon: FiFeather,
    group: "content",
  },
  {
    id: "file",
    name: "File",
    description: "Downloadable file (PDF, DOCX, etc.) — upload or link",
    icon: FiFile,
    group: "content",
  },
  {
    id: "color",
    name: "Color",
    description: "Hex or CSS color value",
    icon: FiDroplet,
    group: "content",
  },
  {
    id: "icon",
    name: "Icon",
    description: "Icon name or ref (e.g. Lucide name, emoji, or asset URL)",
    icon: FiFeather,
    group: "content",
  },
  {
    id: "number",
    name: "Number",
    description: "Numeric value",
    icon: FiHash,
    group: "primitive",
  },
  {
    id: "boolean",
    name: "Boolean",
    description: "True / false toggle",
    icon: FiToggleLeft,
    group: "primitive",
  },
  {
    id: "url",
    name: "URL",
    description: "Link",
    icon: FiLink2,
    group: "primitive",
  },
  {
    id: "date",
    name: "Date",
    description: "Date or datetime",
    icon: FiCalendar,
    group: "primitive",
  },
  {
    id: "json",
    name: "JSON",
    description: "Arbitrary JSON data (object, array, primitive)",
    icon: FiCode,
    group: "primitive",
  },
  {
    id: "array",
    name: "Array",
    description: "List of items — define item shape inside",
    icon: FiList,
    group: "structure",
  },
  {
    id: "object",
    name: "Object",
    description: "Nested object — add properties inside",
    icon: FiBox,
    group: "structure",
  },
];

export const TYPE_LABEL: Record<SectionBlockType, string> = {
  title: "Title",
  description: "Description",
  textarea: "Text area",
  badge: "Badge",
  image: "Image",
  icon_image: "Icon image",
  svgcode: "SVG Code",
  file: "File",
  icon: "Icon",
  color: "Color",
  number: "Number",
  boolean: "Boolean",
  url: "URL",
  date: "Date",
  link: "Link",
  collection_ref: "Collection ref",
  array: "Array",
  object: "Object",
  json: "JSON",
};

export const TYPE_SHORT: Record<SectionBlockType, string> = {
  title: "tit",
  description: "des",
  textarea: "txa",
  badge: "bdg",
  image: "img",
  icon_image: "ico",
  svgcode: "svg",
  file: "file",
  icon: "icn",
  color: "clr",
  number: "num",
  boolean: "bool",
  url: "url",
  date: "date",
  link: "lnk",
  collection_ref: "ref",
  array: "arr",
  object: "obj",
  json: "jsn",
};

export const GROUP_LABEL: Record<SectionTool["group"], string> = {
  content: "Content",
  primitive: "Primitives",
  structure: "Structure",
};

/** Default keys at section root (depth 0). */
const ROOT_DEFAULT_KEY: Partial<Record<SectionBlockType, string>> = {
  title: "title",
  description: "description",
  textarea: "textarea",
  badge: "badge",
  image: "image",
  icon_image: "iconImage",
  svgcode: "svgcode",
  file: "file",
  icon: "icon",
  color: "color",
  link: "link",
  collection_ref: "references",
  array: "items",
  object: "object",
  json: "json",
};

/** Default keys inside containers (depth ≥ 1). */
const NESTED_DEFAULT_KEY: Record<SectionBlockType, string> = {
  title: "title",
  description: "description",
  textarea: "textarea",
  badge: "badge",
  image: "image",
  icon_image: "iconImage",
  svgcode: "svgcode",
  file: "file",
  icon: "icn",
  color: "color",
  number: "number",
  boolean: "boolean",
  url: "url",
  date: "date",
  link: "link",
  collection_ref: "references",
  array: "items",
  object: "object",
  json: "json",
};

function uniqueKey(base: string, existing: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (existing.has(candidate)) {
    candidate = `${base}${n}`;
    n += 1;
  }
  return candidate;
}

function defaultKeyForType(
  type: SectionBlockType,
  depth: number,
  existing: Set<string>
): string {
  const base =
    depth === 0 ? ROOT_DEFAULT_KEY[type] ?? type : NESTED_DEFAULT_KEY[type];
  return uniqueKey(base, existing);
}

export function createBlock(
  type: SectionBlockType,
  depth: number,
  siblingKeys: Set<string>
): SectionBlock {
  const base: SectionBlock = {
    id: crypto.randomUUID(),
    type,
    key: defaultKeyForType(type, depth, siblingKeys),
    children: [],
  };
  if (type === "link") {
    return {
      ...base,
      defaultLink: { value: "", href: "", target: "_self" },
    };
  }
  if (type === "collection_ref") {
    return {
      ...base,
      collectionKey: "testimonials",
      multiple: true,
    };
  }
  return base;
}

function isSectionBlockType(value: string): value is SectionBlockType {
  return SECTION_TOOLS.some((tool) => tool.id === value);
}

function normalizeCustomToolNode(
  input: unknown,
  path: string
): CustomToolTemplateNode {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${path} must be an object`);
  }
  const raw = input as Record<string, unknown>;
  const type = typeof raw.type === "string" ? raw.type.trim() : "";
  const fields = Array.isArray(raw.fields)
    ? raw.fields
    : Array.isArray(raw.children)
      ? raw.children
      : undefined;
  const inferredType = type || (fields ? "object" : "");
  if (!isSectionBlockType(inferredType)) {
    throw new Error(`${path}.type is invalid`);
  }

  const node: CustomToolTemplateNode = { type: inferredType };
  if (typeof raw.key === "string" && raw.key.trim()) {
    node.key = raw.key.trim();
  }
  if (typeof raw.defaultStr === "string") {
    node.defaultStr = raw.defaultStr;
  }
  if (typeof raw.required === "boolean") {
    node.required = raw.required;
  }
  if (typeof raw.collectionKey === "string" && raw.collectionKey.trim()) {
    node.collectionKey = raw.collectionKey.trim();
  }
  if (typeof raw.multiple === "boolean") {
    node.multiple = raw.multiple;
  }
  if (type === "link" && raw.defaultLink !== undefined) {
    if (
      !raw.defaultLink ||
      typeof raw.defaultLink !== "object" ||
      Array.isArray(raw.defaultLink)
    ) {
      throw new Error(`${path}.defaultLink must be an object`);
    }
    const d = raw.defaultLink as Record<string, unknown>;
    node.defaultLink = {
      value: typeof d.value === "string" ? d.value : "",
      href: typeof d.href === "string" ? d.href : "",
      target: typeof d.target === "string" ? d.target : "_self",
    };
  }

  if (inferredType === "array" || inferredType === "object") {
    if (!Array.isArray(fields)) {
      throw new Error(`${path}.fields must be an array for ${inferredType}`);
    }
    node.fields = fields.map((child, index) =>
      normalizeCustomToolNode(child, `${path}.children[${index}]`)
    );
  }

  return node;
}

export function parseCustomToolTemplate(input: unknown): CustomToolTemplateNode {
  return normalizeCustomToolNode(input, "definition");
}

function instantiateTemplateNode(
  template: CustomToolTemplateNode,
  depth: number,
  siblingKeys: Set<string>
): SectionBlock {
  const templateType: SectionBlockType = template.type ?? "object";
  const templateKey = template.key?.trim() ?? "";
  const baseKey =
    templateKey.length > 0
      ? uniqueKey(templateKey, siblingKeys)
      : defaultKeyForType(templateType, depth, siblingKeys);

  const block: SectionBlock = {
    id: crypto.randomUUID(),
    type: templateType,
    key: baseKey,
    children: [],
    ...(template.required ? { required: true } : {}),
  };

  if (template.type === "link") {
    block.defaultLink = {
      value: template.defaultLink?.value ?? "",
      href: template.defaultLink?.href ?? "",
      target: template.defaultLink?.target ?? "_self",
    };
  } else if (
    template.type !== "collection_ref" &&
    template.defaultStr !== undefined
  ) {
    block.defaultStr = template.defaultStr;
  }
  if (template.type === "collection_ref") {
    block.collectionKey = template.collectionKey?.trim() || "testimonials";
    block.multiple = template.multiple !== false;
  }

  const children = template.fields ?? template.children;
  if ((template.type === "array" || template.type === "object") && children) {
    const childKeys = new Set<string>();
    block.children = children.map((child) => {
      const next = instantiateTemplateNode(child, depth + 1, childKeys);
      childKeys.add(next.key.trim());
      return next;
    });
  }

  return block;
}

export function createBlockFromCustomTool(
  definition: unknown,
  depth: number,
  siblingKeys: Set<string>
): SectionBlock {
  const template = parseCustomToolTemplate(definition);
  return instantiateTemplateNode(template, depth, siblingKeys);
}

export function siblingKeysFrom(blocks: SectionBlock[]): Set<string> {
  return new Set(blocks.map((b) => b.key.trim()).filter(Boolean));
}

export function isContainer(t: SectionBlockType): t is "array" | "object" {
  return t === "array" || t === "object";
}

export function addChildToContainer(
  blocks: SectionBlock[],
  containerId: string,
  type: SectionBlockType,
  newBlockDepth: number
): SectionBlock[] {
  return blocks.map((b) => {
    if (b.id === containerId && isContainer(b.type)) {
      const keys = siblingKeysFrom(b.children);
      return {
        ...b,
        children: [...b.children, createBlock(type, newBlockDepth, keys)],
      };
    }
    if (isContainer(b.type)) {
      return {
        ...b,
        children: addChildToContainer(
          b.children,
          containerId,
          type,
          newBlockDepth
        ),
      };
    }
    return b;
  });
}

export function addCustomChildToContainer(
  blocks: SectionBlock[],
  containerId: string,
  definition: unknown,
  newBlockDepth: number
): SectionBlock[] {
  return blocks.map((b) => {
    if (b.id === containerId && isContainer(b.type)) {
      const keys = siblingKeysFrom(b.children);
      return {
        ...b,
        children: [
          ...b.children,
          createBlockFromCustomTool(definition, newBlockDepth, keys),
        ],
      };
    }
    if (isContainer(b.type)) {
      return {
        ...b,
        children: addCustomChildToContainer(
          b.children,
          containerId,
          definition,
          newBlockDepth
        ),
      };
    }
    return b;
  });
}

export function removeBlockById(
  blocks: SectionBlock[],
  id: string
): SectionBlock[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) =>
      isContainer(b.type)
        ? { ...b, children: removeBlockById(b.children, id) }
        : b
    );
}

export function updateBlockKey(
  blocks: SectionBlock[],
  id: string,
  key: string
): SectionBlock[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, key };
    if (isContainer(b.type)) {
      return { ...b, children: updateBlockKey(b.children, id, key) };
    }
    return b;
  });
}

export function updateBlockDefault(
  blocks: SectionBlock[],
  id: string,
  defaultStr: string | undefined
): SectionBlock[] {
  return blocks.map((b) => {
    if (b.id === id) {
      if (isContainer(b.type)) return b;
      if (b.type === "link" || b.type === "collection_ref") return b;
      return {
        ...b,
        defaultStr:
          defaultStr === undefined || defaultStr === ""
            ? undefined
            : defaultStr,
      };
    }
    if (isContainer(b.type)) {
      return {
        ...b,
        children: updateBlockDefault(b.children, id, defaultStr),
      };
    }
    return b;
  });
}

export function updateBlockDefaultLink(
  blocks: SectionBlock[],
  id: string,
  next: { value: string; href: string; target: string }
): SectionBlock[] {
  return blocks.map((b) => {
    if (b.id === id) {
      if (b.type !== "link") return b;
      return { ...b, defaultLink: next };
    }
    if (isContainer(b.type)) {
      return {
        ...b,
        children: updateBlockDefaultLink(b.children, id, next),
      };
    }
    return b;
  });
}

export function updateBlockRequired(
  blocks: SectionBlock[],
  id: string,
  required: boolean
): SectionBlock[] {
  return blocks.map((b) => {
    if (b.id === id) {
      return { ...b, required: required ? true : undefined };
    }
    if (isContainer(b.type)) {
      return {
        ...b,
        children: updateBlockRequired(b.children, id, required),
      };
    }
    return b;
  });
}

export function updateBlockCollectionKey(
  blocks: SectionBlock[],
  id: string,
  collectionKey: string
): SectionBlock[] {
  return blocks.map((b) => {
    if (b.id === id) {
      if (b.type !== "collection_ref") return b;
      return { ...b, collectionKey };
    }
    if (isContainer(b.type)) {
      return {
        ...b,
        children: updateBlockCollectionKey(b.children, id, collectionKey),
      };
    }
    return b;
  });
}

export function updateBlockCollectionMultiple(
  blocks: SectionBlock[],
  id: string,
  multiple: boolean
): SectionBlock[] {
  return blocks.map((b) => {
    if (b.id === id) {
      if (b.type !== "collection_ref") return b;
      return { ...b, multiple };
    }
    if (isContainer(b.type)) {
      return {
        ...b,
        children: updateBlockCollectionMultiple(b.children, id, multiple),
      };
    }
    return b;
  });
}

export function duplicateKeysAmong(blocks: SectionBlock[]): Set<string> {
  const counts = new Map<string, number>();
  for (const b of blocks) {
    const k = b.key.trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(([k]) => k)
  );
}

function tryMoveInArray(
  arr: SectionBlock[],
  blockId: string,
  delta: number
): SectionBlock[] | null {
  const i = arr.findIndex((b) => b.id === blockId);
  if (i < 0) return null;
  const j = i + delta;
  if (j < 0 || j >= arr.length) return arr;
  return arrayMove(arr, i, j);
}

/** Move a field among its siblings (root or inside array/object). */
export function moveBlockSibling(
  blocks: SectionBlock[],
  blockId: string,
  direction: "up" | "down"
): SectionBlock[] {
  const delta = direction === "up" ? -1 : 1;
  const atLevel = tryMoveInArray(blocks, blockId, delta);
  if (atLevel !== null) return atLevel;
  return blocks.map((b) =>
    isContainer(b.type)
      ? { ...b, children: moveBlockSibling(b.children, blockId, direction) }
      : b
  );
}

function reorderInArrayIfBothPresent(
  arr: SectionBlock[],
  activeId: string,
  overId: string
): SectionBlock[] | null {
  const ai = arr.findIndex((b) => b.id === activeId);
  const oi = arr.findIndex((b) => b.id === overId);
  if (ai < 0 || oi < 0) return null;
  return arrayMove(arr, ai, oi);
}

/** Reorder after drag-drop within the same sibling list (root or container). */
export function reorderBlockSiblings(
  blocks: SectionBlock[],
  activeId: string,
  overId: string
): SectionBlock[] {
  const atLevel = reorderInArrayIfBothPresent(blocks, activeId, overId);
  if (atLevel !== null) return atLevel;
  return blocks.map((b) =>
    isContainer(b.type)
      ? {
          ...b,
          children: reorderBlockSiblings(b.children, activeId, overId),
        }
      : b
  );
}

function leafDefaultToExport(
  type: SectionBlockType,
  raw: string | undefined
): unknown | undefined {
  if (raw === undefined || raw === "") return undefined;
  switch (type) {
    case "boolean":
      if (raw === "true") return true;
      if (raw === "false") return false;
      return undefined;
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    default:
      return raw;
  }
}

function leafDefaultToExportLink(
  d: { value: string; href: string; target: string } | undefined
): Record<string, string> | undefined {
  if (!d) return undefined;
  const value = d.value.trim();
  const href = d.href.trim();
  const target = d.target.trim() || "_self";
  if (!value && !href && target === "_self") return undefined;
  return { value, href, target };
}

function blockToExportJson(block: SectionBlock): Record<string, unknown> {
  if (block.type === "array" || block.type === "object") {
    const out: Record<string, unknown> = {
      type: block.type,
      key: block.key.trim(),
      fields: block.children.map(blockToExportJson),
    };
    if (block.required) out.required = true;
    return out;
  }
  if (block.type === "link") {
    const out: Record<string, unknown> = {
      type: "link",
      key: block.key.trim(),
    };
    const ld = leafDefaultToExportLink(block.defaultLink);
    if (ld !== undefined) out.default = ld;
    if (block.required) out.required = true;
    return out;
  }
  if (block.type === "collection_ref") {
    const out: Record<string, unknown> = {
      type: "collection_ref",
      key: block.key.trim(),
      collectionKey: block.collectionKey?.trim() || "testimonials",
      multiple: block.multiple !== false,
    };
    if (block.required) out.required = true;
    return out;
  }
  const out: Record<string, unknown> = {
    type: block.type,
    key: block.key.trim(),
  };
  const d = leafDefaultToExport(block.type, block.defaultStr);
  if (d !== undefined) out.default = d;
  if (block.required) out.required = true;
  return out;
}

export function buildExportJson(
  blocks: SectionBlock[],
  sectionRootKey: string
): Record<string, unknown> {
  const root = sectionRootKey.trim() || "section";
  return {
    [root]: blocks.map(blockToExportJson),
  };
}

export function hasEmptyKeyRecursive(blocks: SectionBlock[]): boolean {
  for (const b of blocks) {
    if (!b.key.trim()) return true;
    if (isContainer(b.type) && hasEmptyKeyRecursive(b.children)) return true;
  }
  return false;
}

/**
 * Normalizes root key while typing: spaces / hyphens → underscores, lowercase,
 * ASCII letters digits and underscores only, collapses repeated underscores.
 */
export function sanitizeSectionRootKeyInput(raw: string): string {
  return raw
    .replace(/[\s-]+/g, "_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_");
}

/**
 * Empty is valid (`buildExportJson` falls back to `section`).
 * Otherwise snake_case: starts with a letter; segments are lowercase letters/digits separated by single underscores (e.g. `hero_banner`, `section`).
 */
export function isValidSectionRootKey(trimmed: string): boolean {
  if (trimmed === "") return true;
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(trimmed);
}

export interface LayoutBuilderProps {
  mode: "create" | "edit";
  /** Required when `mode` is `edit`. */
  layoutId?: string;
}
