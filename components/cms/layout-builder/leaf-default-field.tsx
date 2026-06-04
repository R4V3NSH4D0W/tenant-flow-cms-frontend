"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CmsHtmlDescriptionEditor } from "@/components/cms/cms-html-description-editor";
import type { SectionBlock } from "@/lib/cms/layout-builder";

export function LayoutBuilderLeafDefaultField({
  block,
  onChange,
  onLinkChange,
}: {
  block: SectionBlock;
  onChange: (id: string, value: string | undefined) => void;
  onLinkChange: (
    id: string,
    next: { value: string; href: string; target: string }
  ) => void;
}) {
  const id = block.id;
  const v = block.defaultStr;
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [svgMode, setSvgMode] = useState<"visual" | "code">(
    block.type === "svgcode" && typeof v === "string" && v.trim() ? "visual" : "code"
  );

  if (block.type === "image" || block.type === "icon_image") {
    // Images/icon images are always selected or pasted at edit time — no default value needed.
    return null;
  }

  if (block.type === "file") {
    // File fields have no schema default — the file is always picked at edit time.
    return null;
  }

  if (block.type === "color") {
    // Normalize to a 6-digit hex for the native color input (falls back to #000000).
    const hexForPicker = /^#[0-9a-fA-F]{6}$/.test(v ?? "") ? v! : "#000000";
    return (
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">Default color</span>
        <div className="flex items-center gap-2">
          {/* Hidden native color picker — triggered by clicking the swatch */}
          <input
            ref={colorInputRef}
            type="color"
            value={hexForPicker}
            onChange={(e) => onChange(id, e.target.value)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
          {/* Clickable color swatch */}
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            className="h-8 w-8 shrink-0 rounded-md border shadow-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: hexForPicker }}
            aria-label="Pick color"
            title="Click to open color picker"
          />
          {/* Hex text input — also accepts typed #rrggbb or shorthand */}
          <Input
            value={v ?? ""}
            onChange={(e) => {
              const t = e.target.value;
              onChange(id, t === "" ? undefined : t);
            }}
            className="h-8 w-[130px] font-mono text-xs"
            placeholder="#3b82f6"
            spellCheck={false}
          />
          {v ? (
            <button
              type="button"
              onClick={() => onChange(id, undefined)}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.type === "link") {
    const d = block.defaultLink ?? {
      value: "",
      href: "",
      target: "_self",
    };
    return (
      <div className="max-w-full space-y-2">
        <p className="text-xs text-muted-foreground">Default (optional)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label
              htmlFor={`cms-layout-link-val-${id}`}
              className="text-[11px] text-muted-foreground"
            >
              Label
            </Label>
            <Input
              id={`cms-layout-link-val-${id}`}
              value={d.value}
              onChange={(e) =>
                onLinkChange(id, { ...d, value: e.target.value })
              }
              className="h-8 font-mono text-xs"
              placeholder="Text"
              spellCheck={false}
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor={`cms-layout-link-href-${id}`}
              className="text-[11px] text-muted-foreground"
            >
              URL
            </Label>
            <Input
              id={`cms-layout-link-href-${id}`}
              type="url"
              value={d.href}
              onChange={(e) => onLinkChange(id, { ...d, href: e.target.value })}
              className="h-8 min-w-0 flex-1 font-mono text-xs"
              placeholder="https://…"
              spellCheck={false}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="shrink-0 text-[11px] text-muted-foreground">
            Target
          </span>
          <Select
            value={d.target.trim() || "_self"}
            onValueChange={(next) => onLinkChange(id, { ...d, target: next })}
          >
            <SelectTrigger className="h-8 w-full max-w-[220px] text-xs sm:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_self">Same tab (_self)</SelectItem>
              <SelectItem value="_blank">New tab (_blank)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (block.type === "boolean") {
    const sel =
      v === "true" ? "true" : v === "false" ? "false" : "__unset__";
    return (
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">Default</span>
        <Select
          value={sel}
          onValueChange={(next) => {
            if (next === "__unset__") onChange(id, undefined);
            else onChange(id, next);
          }}
        >
          <SelectTrigger className="h-8 w-full max-w-[220px] text-xs sm:w-auto">
            <SelectValue placeholder="No default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset__">No default</SelectItem>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (block.type === "number") {
    return (
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">Default</span>
        <Input
          type="number"
          value={v ?? ""}
          onChange={(e) => {
            const t = e.target.value;
            onChange(id, t === "" ? undefined : t);
          }}
          className="h-8 w-full max-w-[220px] font-mono text-xs sm:w-auto"
          placeholder="Optional"
        />
      </div>
    );
  }

  if (block.type === "description") {
    return (
      <div className="max-w-full space-y-2">
        <p className="text-xs text-muted-foreground">Default (optional)</p>
        <CmsHtmlDescriptionEditor
          id={`cms-layout-desc-def-${id}`}
          value={v ?? ""}
          onChange={(html) => onChange(id, html === "" ? undefined : html)}
          placeholder="Optional HTML default"
          variant="compact"
        />
      </div>
    );
  }

  if (block.type === "textarea") {
    return (
      <div className="max-w-full space-y-2">
        <p className="text-xs text-muted-foreground">Default (optional)</p>
        <Textarea
          id={`cms-layout-textarea-def-${id}`}
          value={v ?? ""}
          onChange={(e) => {
            const t = e.target.value;
            onChange(id, t === "" ? undefined : t);
          }}
          placeholder="Plain text — line breaks preserved"
          rows={3}
          className="min-h-[4.5rem] resize-y font-mono text-xs"
          spellCheck={false}
        />
      </div>
    );
  }

  if (block.type === "svgcode") {
    const svgVal = typeof v === "string" ? v : "";
    return (
      <div className="max-w-full space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Default SVG Code (optional)</p>
          <div className="flex rounded-md border bg-muted/40 p-0.5">
            <Button
              type="button"
              variant={svgMode === "visual" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[10px] font-medium"
              onClick={() => setSvgMode("visual")}
            >
              Visual
            </Button>
            <Button
              type="button"
              variant={svgMode === "code" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[10px] font-medium"
              onClick={() => setSvgMode("code")}
            >
              Code
            </Button>
          </div>
        </div>

        {svgMode === "visual" ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/15 p-4 text-center min-h-[96px]">
            {svgVal.trim() ? (
              <div 
                className="flex items-center justify-center p-2.5 border rounded bg-background shadow-xs [&>svg]:w-10 [&>svg]:h-10 [&>svg]:text-foreground [&>svg]:max-w-full [&>svg]:max-h-full"
                dangerouslySetInnerHTML={{ __html: svgVal }}
              />
            ) : (
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground mb-1.5">No default SVG code.</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setSvgMode("code")}
                >
                  Paste SVG Code
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <Textarea
              id={`cms-layout-svgcode-def-${id}`}
              className="w-full min-h-[100px] font-mono text-xs resize-y leading-normal"
              value={svgVal}
              onChange={(e) => {
                const t = e.target.value;
                onChange(id, t === "" ? undefined : t);
              }}
              placeholder='<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
  <path strokeLinecap="round" strokeLinejoin="round" d="..." />
</svg>'
              spellCheck={false}
            />
            <p className="text-[10px] text-muted-foreground">
              Paste raw SVG code (including `&lt;svg&gt;` wrapper). Switch to Visual to preview it.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (block.type === "json") {
    const jsonVal = typeof v === "string" ? v : "";
    let localError: string | null = null;
    if (jsonVal.trim()) {
      try {
        JSON.parse(jsonVal);
      } catch (err) {
        localError = err instanceof Error ? err.message : "Invalid JSON";
      }
    }

    return (
      <div className="max-w-full space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Default JSON (optional)</p>
        </div>
        <Textarea
          id={`cms-layout-json-def-${id}`}
          className="w-full min-h-[100px] font-mono text-xs resize-y leading-normal"
          value={jsonVal}
          onChange={(e) => {
            const t = e.target.value;
            onChange(id, t === "" ? undefined : t);
          }}
          placeholder='{ "key": "value" }'
          spellCheck={false}
        />
        {localError ? (
          <p className="text-[10px] text-destructive">
            Invalid JSON: {localError}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Must be valid JSON code. Leave blank for empty object `{}`.
          </p>
        )}
      </div>
    );
  }

  if (block.type === "icon") {
    return (
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">Default</span>
        <Input
          value={v ?? ""}
          onChange={(e) => {
            const t = e.target.value;
            onChange(id, t === "" ? undefined : t);
          }}
          className="h-8 min-w-0 flex-1 font-mono text-xs"
          placeholder="e.g. Star (Lucide name), emoji, or URL"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">Default</span>
      <Input
        value={v ?? ""}
        onChange={(e) => {
          const t = e.target.value;
          onChange(id, t === "" ? undefined : t);
        }}
        className="h-8 min-w-0 flex-1 font-mono text-xs"
        placeholder="Optional default"
        spellCheck={false}
      />
    </div>
  );
}
