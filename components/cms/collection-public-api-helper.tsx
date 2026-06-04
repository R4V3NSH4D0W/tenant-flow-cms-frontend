"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { absoluteTenantApiUrl } from "@/lib/cms/absolute-url";
import { buildPublicCollectionLookupQuery } from "@/lib/cms/collection-public-filter";
import {
  publicCmsCollectionApiPath,
  trimPublicApiPathDisplay,
} from "@/lib/cms/public-site-api-paths";
import { cn } from "@/lib/shared/utils";

const LOOKUP_OPTIONS = [
  { value: "slug", label: "slug" },
  { value: "field.id", label: "id" },
] as const;

const VALID_LOOKUP = new Set<string>(LOOKUP_OPTIONS.map((o) => o.value));

function lookupStorageKey(projectSlug: string, collectionKey: string) {
  return `cms.collectionPublicLookup.v1:${projectSlug}:${collectionKey}`;
}

type Props = {
  collectionKey: string;
  projectSlug: string | null | undefined;
  tenantDomain?: string | null;
};

export function CollectionPublicApiHelper({
  collectionKey,
  projectSlug,
  tenantDomain,
}: Props) {
  const apiPath = publicCmsCollectionApiPath(collectionKey);
  const baseUrl = absoluteTenantApiUrl(apiPath, {
    slug: projectSlug,
    primaryDomain: tenantDomain,
  });

  const [lookupKey, setLookupKey] = useState<string>("slug");
  const [sample, setSample] = useState("example-value");
  const [hydrated, setHydrated] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const slug = projectSlug?.trim();
    if (!slug) {
      setTimeout(() => setHydrated(true), 0);
      return;
    }
    let matchedLookupKey = "slug";
    let matchedSample = "example-value";
    try {
      const raw = localStorage.getItem(lookupStorageKey(slug, collectionKey));
      if (raw) {
        const p = JSON.parse(raw) as { lookupKey?: string; sample?: string };
        if (typeof p.lookupKey === "string" && VALID_LOOKUP.has(p.lookupKey)) {
          matchedLookupKey = p.lookupKey;
        }
        if (typeof p.sample === "string") {
          matchedSample = p.sample;
        }
      }
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      setLookupKey(matchedLookupKey);
      setSample(matchedSample);
      setHydrated(true);
    }, 0);
  }, [collectionKey, projectSlug]);

  useEffect(() => {
    const slug = projectSlug?.trim();
    if (!slug || !hydrated) return;
    try {
      localStorage.setItem(
        lookupStorageKey(slug, collectionKey),
        JSON.stringify({ lookupKey, sample }),
      );
    } catch {
      /* ignore */
    }
  }, [collectionKey, projectSlug, lookupKey, sample, hydrated]);

  const lookupQuery = buildPublicCollectionLookupQuery(lookupKey, sample);
  const filterHref = lookupQuery ? `${baseUrl}?${lookupQuery}` : baseUrl;
  const filterPathDisplay = lookupQuery
    ? `${apiPath}?${trimPublicApiPathDisplay(lookupQuery, 64)}`
    : apiPath;

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border/70 bg-muted/35 p-4 shadow-xs",
        "ring-1 ring-border/20",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="font-sans text-xs font-medium text-muted-foreground">Public API</p>
          {!panelOpen ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Your storefront can call <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[10px]">GET {apiPath}</code>{" "}
              with a <span className="font-mono">slug</span> or <span className="font-mono">id</span> filter. Click{" "}
              <span className="font-mono text-foreground/90">&lt;/&gt;</span> to build the URL.
            </p>
          ) : (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Filter query only — no <code className="rounded bg-background/80 px-1 text-[10px]">limit</code> /{" "}
              <code className="rounded bg-background/80 px-1 text-[10px]">offset</code>. The JSON body is a single{" "}
              <code className="rounded bg-background/80 px-1 text-[10px]">item</code> object, not an array.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 shrink-0 border-border/80 bg-background/80 px-3 font-mono text-sm shadow-sm",
            "hover:bg-background",
            panelOpen && "border-primary/40 bg-background",
          )}
          title={panelOpen ? "Hide URL builder" : "Show URL builder"}
          aria-expanded={panelOpen}
          aria-pressed={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
        >
          <span aria-hidden className="leading-none tracking-tight">
            &lt;/&gt;
          </span>
          <span className="sr-only">Toggle URL builder</span>
        </Button>
      </div>

      {panelOpen ? (
        <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="pubapi-lookup" className="text-xs text-foreground">
                Match on
              </Label>
              <Select value={lookupKey} onValueChange={setLookupKey}>
                <SelectTrigger id="pubapi-lookup" className="h-10 w-full bg-background font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOKUP_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="font-mono text-sm">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pubapi-sample" className="text-xs text-foreground">
                Value
              </Label>
              <Input
                id="pubapi-sample"
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                placeholder={lookupKey === "slug" ? "Slug string" : "CUID / item id"}
                className="h-10 font-mono text-sm"
              />
            </div>
          </div>

          {lookupQuery ? (
            <a
              href={filterHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full min-w-0 items-center gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2.5 font-mono text-[11px] text-primary transition-colors hover:bg-background hover:underline"
              title={filterHref}
            >
              <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="min-w-0 flex-1 break-all">{filterPathDisplay}</span>
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">Enter a value to preview the full URL.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
