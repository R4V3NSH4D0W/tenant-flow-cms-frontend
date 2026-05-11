"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { CmsPublicApiLink } from "@/components/cms/cms-public-api-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import {
  useCmsCollections,
  useCmsDynamicRoute,
  useCmsLayouts,
  useCreateCmsDynamicRoute,
  useTestCmsDynamicRoute,
  useUpdateCmsDynamicRoute,
} from "@/hooks/use-cms";
import type { CmsDynamicRouteMatchRule } from "@/lib/cms/api";
import {
  MATCH_PARAM_CUSTOM,
  MATCH_TARGET_CUSTOM,
  extractPatternParamNames,
  matchFieldOptionsFromCollectionSchema,
  matchRulePresetSelectValue,
  parseKindFieldPath,
  schemaMatchOptionValue,
  type SchemaMatchOption,
} from "@/lib/cms/collection-schema-match-options";
import {
  examplePathForDynamicRoutePattern,
  publicCmsDynamicRouteApiPath,
} from "@/lib/cms/public-site-api-paths";

type LocalMatchRule = CmsDynamicRouteMatchRule & { _customTarget?: boolean };

type Props = {
  mode: "create" | "edit";
  routeId?: string;
};

function emptyRule(): LocalMatchRule {
  return { param: "", fieldPath: "", kind: "field", _customTarget: false };
}

function toLocalRules(rules: CmsDynamicRouteMatchRule[], options: SchemaMatchOption[]): LocalMatchRule[] {
  return rules.map((r) => ({
    ...r,
    _customTarget: matchRulePresetSelectValue(r, options) === MATCH_TARGET_CUSTOM,
  }));
}

function optgroupLabel(group: SchemaMatchOption["group"]): string {
  if (group === "row") return "Item row";
  if (group === "reference") return "References (linked collection)";
  return "Payload fields";
}

const SELECT_NONE = "__dynamic_route_select_none__";

export function DynamicRouteForm({ mode, routeId }: Props) {
  const router = useRouter();
  const { currentProject } = useCurrentProject();
  const { data: collectionsRes } = useCmsCollections();
  const { data: layoutsRes } = useCmsLayouts();
  const { data: routeRes, isLoading: routeLoading } = useCmsDynamicRoute(routeId ?? "", {
    enabled: mode === "edit" && !!routeId,
  });
  const createRoute = useCreateCmsDynamicRoute();
  const updateRoute = useUpdateCmsDynamicRoute();

  const [draft, setDraft] = useState<{
    syncedRouteId: string | null;
    name: string;
    pattern: string;
    collectionKey: string;
    templateLayoutId: string;
    isActive: boolean;
    matchRules: LocalMatchRule[];
  }>({
    syncedRouteId: null,
    name: "",
    pattern: "/:slug",
    collectionKey: "",
    templateLayoutId: "",
    isActive: true,
    matchRules: [
      { param: "slug", fieldPath: "slug", kind: "field", _customTarget: false },
    ],
  });
  const [previewPath, setPreviewPath] = useState("example-slug");

  const {
    data: previewRes,
    isFetching: previewLoading,
    isError: previewError,
    refetch: refetchPreview,
  } = useTestCmsDynamicRoute(previewPath, { enabled: false });

  const collections = useMemo(
    () => collectionsRes?.collections ?? [],
    [collectionsRes?.collections],
  );
  const layouts = useMemo(() => layoutsRes?.layouts ?? [], [layoutsRes?.layouts]);

  const route = routeRes?.route;
  if (
    mode === "edit" &&
    route &&
    draft.syncedRouteId !== route.id
  ) {
    const collectionForRules = collections.find((c) => c.key === route.collectionKey);
    const ruleOptions = matchFieldOptionsFromCollectionSchema(
      collectionForRules?.schema ?? null,
    );
    setDraft({
      syncedRouteId: route.id,
      name: route.name,
      pattern: route.pattern,
      collectionKey: route.collectionKey,
      templateLayoutId: route.templateLayoutId ?? "",
      isActive: route.isActive,
      matchRules:
        Array.isArray(route.matchRules) && route.matchRules.length > 0
          ? toLocalRules(route.matchRules, ruleOptions)
          : [emptyRule()],
    });
  }

  const isPending = createRoute.isPending || updateRoute.isPending;
  const selectedCollection = useMemo(
    () => collections.find((c) => c.key === draft.collectionKey),
    [collections, draft.collectionKey],
  );
  const schemaMatchOptions = useMemo(
    () => matchFieldOptionsFromCollectionSchema(selectedCollection?.schema ?? null),
    [selectedCollection?.schema],
  );
  const patternParams = useMemo(
    () => extractPatternParamNames(draft.pattern),
    [draft.pattern],
  );
  const publicResolverExamplePath = useMemo(
    () => examplePathForDynamicRoutePattern(draft.pattern),
    [draft.pattern],
  );
  const matchOptionsByGroup = useMemo(() => {
    const row = schemaMatchOptions.filter((o) => o.group === "row");
    const payload = schemaMatchOptions.filter((o) => o.group === "payload");
    const reference = schemaMatchOptions.filter((o) => o.group === "reference");
    return { row, payload, reference };
  }, [schemaMatchOptions]);
  const canSubmit = draft.name.trim() && draft.pattern.trim() && draft.collectionKey.trim();
  const previewItemJson = previewRes?.item ? JSON.stringify(previewRes.item, null, 2) : "";

  async function onSubmit() {
    if (!canSubmit) return;
    const payload = {
      name: draft.name.trim(),
      pattern: draft.pattern.trim(),
      collectionKey: draft.collectionKey.trim(),
      templateLayoutId: draft.templateLayoutId || null,
      isActive: draft.isActive,
      matchRules: draft.matchRules
        .map(
          (rule): CmsDynamicRouteMatchRule => ({
            param: rule.param?.trim() ?? "",
            fieldPath: rule.fieldPath?.trim() ?? "",
            kind: rule.kind === "ref" ? "ref" : "field",
          }),
        )
        .filter((rule) => rule.param && rule.fieldPath),
    };
    if (mode === "create") {
      const created = await createRoute.mutateAsync(payload);
      router.replace(`/dashboard/cms/dynamic-routes/${created.route.id}`);
      return;
    }
    if (!routeId) return;
    await updateRoute.mutateAsync({ id: routeId, data: payload });
  }

  if (mode === "edit" && routeLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading dynamic route...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
        <Link href="/dashboard/cms/dynamic-routes">← Dynamic routes</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create dynamic route" : "Edit dynamic route"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            A dynamic route maps a <strong>URL path</strong> to <strong>one collection item</strong>. Your
            storefront (or any client) calls the public resolver with a path string — for example three
            segments like <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">x/y/z</code> — no
            fixed words; you define the shape with the pattern and rules below.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dr-name">Label (admin only)</Label>
              <Input
                id="dr-name"
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Product detail"
              />
              <p className="text-xs text-muted-foreground">
                Shown in this dashboard only — not part of the public URL.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dr-pattern">URL pattern</Label>
              <Input
                id="dr-pattern"
                value={draft.pattern}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, pattern: e.target.value }))
                }
                placeholder="/:category/:slug"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="rounded bg-muted px-1">/:paramName</code> per segment. Static segments
                are allowed (e.g. <code className="rounded bg-muted px-1">/blog/:slug</code>). Add as many{" "}
                <code className="rounded bg-muted px-1">:params</code> as you need for{" "}
                <code className="rounded bg-muted px-1">a/b/c/…</code>.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dr-collection">Collection</Label>
              <Select
                value={draft.collectionKey || SELECT_NONE}
                onValueChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    collectionKey: v === SELECT_NONE ? "" : v,
                  }))
                }
              >
                <SelectTrigger id="dr-collection" className="h-10 w-full">
                  <SelectValue placeholder="Which collection row should this URL open?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>
                    Which collection row should this URL open?
                  </SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.key}>
                      {c.name} ({c.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dr-layout">Optional: layout shell</Label>
              <Select
                value={draft.templateLayoutId || SELECT_NONE}
                onValueChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    templateLayoutId: v === SELECT_NONE ? "" : v,
                  }))
                }
              >
                <SelectTrigger id="dr-layout" className="h-10 w-full">
                  <SelectValue placeholder="None — only return the matched item (and params)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>
                    None — only return the matched item (and params)
                  </SelectItem>
                  {layouts.map((layout) => (
                    <SelectItem key={layout.id} value={layout.id}>
                      {layout.name} ({layout.rootKey})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If set, the API also returns this layout definition so the storefront can render the same
                section schema for every URL that matches this route. The row still comes from the collection.
              </p>
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Public JSON API (same idea as collections)</p>
            <CmsPublicApiLink
              apiPath={publicCmsDynamicRouteApiPath(publicResolverExamplePath)}
              tenantSlug={currentProject?.slug}
              tenantDomain={currentProject?.primaryDomain}
              titleHint={`Send GET with query path= (no leading slash), e.g. path=${publicResolverExamplePath}`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:items-end">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dr-active"
                  checked={draft.isActive}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, isActive: checked === true }))
                  }
                />
                <Label htmlFor="dr-active" className="cursor-pointer text-sm font-normal">
                  Active (inactive routes are ignored)
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-md border p-4">
            <div>
              <h3 className="text-sm font-medium">How the URL finds the row</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Each <code className="rounded bg-muted px-1">:param</code> in the pattern becomes one path
                segment. Pick the param name, then choose which row field or reference field must equal that
                segment. The dropdown is built from the <strong>selected collection&apos;s schema</strong>{" "}
                (payload keys, nested objects, and <code className="rounded bg-muted px-1">collection_ref</code>{" "}
                → <code className="rounded bg-muted px-1">.slug</code> / <code className="rounded bg-muted px-1">.title</code>
                ). Use Custom if you need a path not listed.
              </p>
            </div>
            <div className="hidden text-xs text-muted-foreground md:grid md:grid-cols-12 md:gap-2 md:px-2 font-medium">
              <span className="md:col-span-3">Pattern param</span>
              <span className="md:col-span-8">Must match this field</span>
              <span className="md:col-span-1" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium md:hidden">Rules</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    matchRules: [...prev.matchRules, emptyRule()],
                  }))
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add rule
              </Button>
            </div>
            {draft.matchRules.map((rule, index) => {
              const paramTrim = (rule.param ?? "").trim();
              const paramInPattern =
                patternParams.length > 0 && patternParams.includes(paramTrim);
              const paramSelectValue = paramInPattern ? paramTrim : MATCH_PARAM_CUSTOM;
              const presetVal = rule._customTarget
                ? MATCH_TARGET_CUSTOM
                : matchRulePresetSelectValue(rule, schemaMatchOptions);

              return (
                <div
                  key={`rule-${index}`}
                  className="grid gap-2 rounded-md border bg-background p-2 md:grid-cols-12 md:items-start"
                >
                  <div className="md:col-span-3 space-y-2">
                    {patternParams.length > 0 ? (
                      <>
                        <Select
                          value={paramSelectValue}
                          onValueChange={(v) =>
                            setDraft((prev) => ({
                              ...prev,
                              matchRules: prev.matchRules.map((x, i) =>
                                i === index
                                  ? { ...x, param: v === MATCH_PARAM_CUSTOM ? "" : v }
                                  : x,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger
                            className="h-10 w-full font-mono text-sm"
                            aria-label={`Pattern param for rule ${index + 1}`}
                          >
                            <SelectValue placeholder="Param" />
                          </SelectTrigger>
                          <SelectContent>
                            {patternParams.map((p) => (
                              <SelectItem key={p} value={p} className="font-mono text-sm">
                                {p}
                              </SelectItem>
                            ))}
                            <SelectItem value={MATCH_PARAM_CUSTOM}>Custom…</SelectItem>
                          </SelectContent>
                        </Select>
                        {paramSelectValue === MATCH_PARAM_CUSTOM && (
                          <Input
                            className="font-mono text-sm"
                            placeholder="param name (like pattern :segment)"
                            title="Must match a :param name from the URL pattern"
                            value={rule.param}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                matchRules: prev.matchRules.map((x, i) =>
                                  i === index ? { ...x, param: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                        )}
                      </>
                    ) : (
                      <Input
                        className="font-mono text-sm"
                        placeholder="Matches :name in pattern"
                        title="Must match a name in your pattern after :"
                        value={rule.param}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            matchRules: prev.matchRules.map((x, i) =>
                              i === index ? { ...x, param: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                    )}
                    {patternParams.length > 0 ? (
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        Params in pattern: {patternParams.join(", ")}
                      </p>
                    ) : (
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        Add <code className="rounded bg-muted px-0.5">/:param</code> segments to the pattern to
                        enable quick picks.
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-8 space-y-2">
                    <Select
                      value={presetVal}
                      onValueChange={(v) => {
                        if (v === MATCH_TARGET_CUSTOM) {
                          setDraft((prev) => ({
                            ...prev,
                            matchRules: prev.matchRules.map((x, i) =>
                              i === index ? { ...x, _customTarget: true } : x,
                            ),
                          }));
                          return;
                        }
                        const parsed = parseKindFieldPath(v);
                        if (!parsed) return;
                        setDraft((prev) => ({
                          ...prev,
                          matchRules: prev.matchRules.map((x, i) =>
                            i === index ? { ...x, ...parsed, _customTarget: false } : x,
                          ),
                        }));
                      }}
                    >
                      <SelectTrigger
                        className="h-10 w-full text-sm"
                        aria-label={`Match field for rule ${index + 1}`}
                      >
                        <SelectValue placeholder="Choose field or reference" />
                      </SelectTrigger>
                      <SelectContent>
                        {matchOptionsByGroup.row.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>{optgroupLabel("row")}</SelectLabel>
                            {matchOptionsByGroup.row.map((o) => (
                              <SelectItem key={schemaMatchOptionValue(o)} value={schemaMatchOptionValue(o)}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {matchOptionsByGroup.payload.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>{optgroupLabel("payload")}</SelectLabel>
                            {matchOptionsByGroup.payload.map((o) => (
                              <SelectItem key={schemaMatchOptionValue(o)} value={schemaMatchOptionValue(o)}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {matchOptionsByGroup.reference.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>{optgroupLabel("reference")}</SelectLabel>
                            {matchOptionsByGroup.reference.map((o) => (
                              <SelectItem key={schemaMatchOptionValue(o)} value={schemaMatchOptionValue(o)}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        <SelectItem value={MATCH_TARGET_CUSTOM}>Custom path…</SelectItem>
                      </SelectContent>
                    </Select>
                    {presetVal === MATCH_TARGET_CUSTOM && (
                      <div className="flex flex-wrap gap-2">
                        <Select
                          value={rule.kind === "ref" ? "ref" : "field"}
                          onValueChange={(v) =>
                            setDraft((prev) => ({
                              ...prev,
                              matchRules: prev.matchRules.map((x, i) =>
                                i === index
                                  ? { ...x, kind: v === "ref" ? "ref" : "field" }
                                  : x,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger className="h-10 w-[7.5rem] shrink-0" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="field">field</SelectItem>
                            <SelectItem value="ref">ref</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          className="min-w-[12rem] flex-1 font-mono text-sm"
                          placeholder={
                            rule.kind === "ref"
                              ? "e.g. country.slug"
                              : "e.g. slug or region_key"
                          }
                          value={rule.fieldPath}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              matchRules: prev.matchRules.map((x, i) =>
                                i === index ? { ...x, fieldPath: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </div>
                    )}
                    {!draft.collectionKey ? (
                      <p className="text-[10px] text-muted-foreground">
                        Select a collection to load payload and reference fields from its schema (row fields are
                        always available).
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:col-span-1"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        matchRules: prev.matchRules.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={onSubmit} disabled={!canSubmit || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : mode === "create" ? (
                "Create route"
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test path</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paste a path <strong>without the domain</strong>, same shape your app will send to the API (
            <code className="rounded bg-muted px-1 text-xs">path=…</code>). Examples: one segment{" "}
            <code className="rounded bg-muted px-1 text-xs">widgets</code> or several{" "}
            <code className="rounded bg-muted px-1 text-xs">east/coastal/item-one</code>.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={previewPath}
              onChange={(e) => setPreviewPath(e.target.value)}
              placeholder="segment-one/segment-two"
              className="font-mono text-sm"
            />
            <Button type="button" variant="outline" onClick={() => void refetchPreview()}>
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
            </Button>
          </div>
          {previewError ? (
            <p className="text-sm text-destructive">No matching route/item found for this path.</p>
          ) : previewRes?.success ? (
            <div className="space-y-1 rounded-md border bg-muted/20 p-3 text-xs">
              <p>
                Matched route: <span className="font-mono">{previewRes.route.name}</span>
              </p>
              <p>
                Pattern: <span className="font-mono">{previewRes.route.pattern}</span>
              </p>
              <pre className="max-h-52 overflow-auto rounded bg-background p-2">{previewItemJson}</pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
