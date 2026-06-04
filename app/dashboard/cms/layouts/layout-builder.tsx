"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Image as ImageIcon, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { appendAddLayoutIdToUrl } from "@/lib/cms/add-layout-query";
import { absoluteApiUrl } from "@/lib/cms/absolute-url";

// Utility to strip domain from a URL, returning only the path
function stripDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}
import { uploadCmsReferenceImage } from "@/lib/cms/reference-image-upload";
import { CmsReferenceScreenshotField } from "@/components/cms/cms-reference-screenshot-field";
import { LayoutBuilderBlockBranch } from "@/components/cms/layout-builder/block-branch";
import { LayoutBuilderGroupedToolPalette } from "@/components/cms/layout-builder/grouped-tool-palette";
import { cn } from "@/lib/shared/utils";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import {
  addCustomChildToContainer,
  addChildToContainer,
  buildExportJson,
  createBlock,
  createBlockFromCustomTool,
  duplicateKeysAmong,
  hasEmptyKeyRecursive,
  isValidSectionRootKey,
  moveBlockSibling,
  removeBlockById,
  reorderBlockSiblings,
  sanitizeSectionRootKeyInput,
  siblingKeysFrom,
  updateBlockDefault,
  updateBlockDefaultLink,
  updateBlockCollectionKey,
  updateBlockCollectionMultiple,
  updateBlockSelectOptions,
  updateBlockKey,
  updateBlockRequired,
  type LayoutBuilderProps,
  type SectionBlock,
  type SectionBlockType,
} from "@/lib/cms/layout-builder";
import {
  layoutFieldDefsToHydratedBlocks,
  parseJsonInputToLayoutDefs,
  parseLayoutSchema,
} from "@/lib/cms/layout-payload";
import {
  useCmsLayout,
  useCmsCustomTools,
  useCreateCmsLayout,
  useUpdateCmsLayout,
} from "@/hooks/use-cms";
import { useSaveShortcut } from "@/hooks/use-save-shortcut";
import type { CmsCustomTool } from "@/lib/cms/api";

export type { LayoutBuilderProps, SectionBlock, SectionBlockType };

function LayoutBuilder({ mode, layoutId }: LayoutBuilderProps) {
  const { currentProject } = useCurrentProject();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToRaw = searchParams.get("returnTo");

  const isEdit = mode === "edit" && !!layoutId;
  const layoutQuery = useCmsLayout(layoutId ?? "");
  const hydratedRef = useRef(false);
  /** Prevents double-submit (e.g. rapid Publish clicks) before/while mutations run. */
  const publishLockRef = useRef(false);

  const [blocks, setBlocks] = useState<SectionBlock[]>([]);
  /** Top-level JSON property name wrapping the field array (default `section`). */
  const [sectionRootKey, setSectionRootKey] = useState("section");
  /** Stored layout name for the API (`CmsLayout.name`). */
  const [layoutName, setLayoutName] = useState("");
  const [isSectionRootKeyManual, setIsSectionRootKeyManual] = useState(isEdit);
  /** Optional screenshot / wireframe URL (layout metadata, not schema JSON). */
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [pendingReferenceImageFile, setPendingReferenceImageFile] =
    useState<File | null>(null);
  const [pendingReferencePreviewUrl, setPendingReferencePreviewUrl] =
    useState("");

  const createLayout = useCreateCmsLayout();
  const updateLayout = useUpdateCmsLayout();
  const customToolsQuery = useCmsCustomTools();

  useEffect(() => {
    hydratedRef.current = false;
  }, [layoutId]);

  useEffect(() => {
    if (!pendingReferenceImageFile) {
      setPendingReferencePreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(pendingReferenceImageFile);
    setPendingReferencePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pendingReferenceImageFile]);

  useEffect(() => {
    if (!isEdit || !layoutQuery.data?.layout || hydratedRef.current) return;
    const layout = layoutQuery.data.layout;
    if (layout.id !== layoutId) return;
    hydratedRef.current = true;
    const rawSchema = layout.schema;
    if (
      !rawSchema ||
      typeof rawSchema !== "object" ||
      Array.isArray(rawSchema)
    ) {
      setSectionRootKey(
        sanitizeSectionRootKeyInput(layout.rootKey ?? "") || "section",
      );
      setLayoutName(layout.name);
      // Accept full URL or path as provided by backend
      setReferenceImageUrl(layout.referenceImageUrl?.trim() ?? "");
      setPendingReferenceImageFile(null);
      setBlocks([]);
      return;
    }
    const { rootKey, defs } = parseLayoutSchema(
      rawSchema as Record<string, unknown>,
      layout.rootKey,
    );
    setSectionRootKey(sanitizeSectionRootKeyInput(rootKey));
    setLayoutName(layout.name);
    // Accept full URL or path as provided by backend
    setReferenceImageUrl(layout.referenceImageUrl?.trim() ?? "");
    setPendingReferenceImageFile(null);
    setBlocks(layoutFieldDefsToHydratedBlocks(defs) as SectionBlock[]);
  }, [isEdit, layoutId, layoutQuery.data?.layout]);

  const addRoot = useCallback((type: SectionBlockType) => {
    setBlocks((prev) => {
      const keys = siblingKeysFrom(prev);
      return [...prev, createBlock(type, 0, keys)];
    });
    toast.success(`${type} added`, {
      id: "add-tool",
      position: "bottom-right",
      style: { background: "black", color: "white", border: "1px solid #333" },
    });
  }, []);

  const addIntoContainer = useCallback(
    (containerId: string, type: SectionBlockType, childDepth: number) => {
      setBlocks((prev) =>
        addChildToContainer(prev, containerId, type, childDepth),
      );
      toast.success(`${type} added to container`, {
        id: "add-tool",
        position: "bottom-right",
        style: { background: "black", color: "white", border: "1px solid #333" },
      });
    },
    [],
  );

  const addCustomRoot = useCallback((tool: CmsCustomTool) => {
    setBlocks((prev) => {
      const keys = siblingKeysFrom(prev);
      try {
        const newBlocks = [...prev, createBlockFromCustomTool(tool.definition, 0, keys)];
        toast.success(`${tool.name} added`, {
          id: "add-tool",
          position: "bottom-right",
          style: { background: "black", color: "white", border: "1px solid #333" },
        });
        return newBlocks;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `Tool "${tool.name}" is invalid: ${error.message}`
            : `Tool "${tool.name}" is invalid.`,
        );
        return prev;
      }
    });
  }, []);

  const addCustomIntoContainer = useCallback(
    (containerId: string, tool: CmsCustomTool, childDepth: number) => {
      setBlocks((prev) => {
        try {
          const newBlocks = addCustomChildToContainer(
            prev,
            containerId,
            tool.definition,
            childDepth,
          );
          toast.success(`${tool.name} added to container`, {
            id: "add-tool",
            position: "bottom-right",
            style: { background: "black", color: "white", border: "1px solid #333" },
          });
          return newBlocks;
        } catch (error) {
          toast.error(
            error instanceof Error
              ? `Tool "${tool.name}" is invalid: ${error.message}`
              : `Tool "${tool.name}" is invalid.`,
          );
          return prev;
        }
      });
    },
    [],
  );

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => removeBlockById(prev, id));
  }, []);

  const setBlockKey = useCallback((id: string, key: string) => {
    setBlocks((prev) => updateBlockKey(prev, id, key));
  }, []);

  const setBlockDefault = useCallback(
    (id: string, defaultStr: string | undefined) => {
      setBlocks((prev) => updateBlockDefault(prev, id, defaultStr));
    },
    [],
  );

  const setBlockDefaultLink = useCallback(
    (id: string, next: { value: string; href: string; target: string }) => {
      setBlocks((prev) => updateBlockDefaultLink(prev, id, next));
    },
    [],
  );

  const setBlockRequired = useCallback((id: string, required: boolean) => {
    setBlocks((prev) => updateBlockRequired(prev, id, required));
  }, []);

  const setBlockCollectionKey = useCallback(
    (id: string, key: string) => {
      setBlocks((prev) => updateBlockCollectionKey(prev, id, key));
    },
    [],
  );

  const setBlockCollectionMultiple = useCallback(
    (id: string, multiple: boolean) => {
      setBlocks((prev) => updateBlockCollectionMultiple(prev, id, multiple));
    },
    [],
  );

  const setBlockSelectOptions = useCallback(
    (id: string, options: string[]) => {
      setBlocks((prev) => updateBlockSelectOptions(prev, id, options));
    },
    [],
  );

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    setBlocks((prev) => moveBlockSibling(prev, id, direction));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) =>
      reorderBlockSiblings(prev, String(active.id), String(over.id)),
    );
  }, []);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const jsonString = useMemo(
    () => JSON.stringify(buildExportJson(blocks, sectionRootKey), null, 2),
    [blocks, sectionRootKey],
  );

  /** When non-null, user has edited the JSON textarea; display this instead of jsonString. */
  const [editedJson, setEditedJson] = useState<string | null>(null);
  /** True for the whole publish flow (validation, optional upload, API call). */
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    setEditedJson(null);
  }, [blocks, sectionRootKey]);

  const jsonDisplayValue = editedJson ?? jsonString;

  const copyJson = useCallback(() => {
    void navigator.clipboard.writeText(jsonDisplayValue);
    toast.success("JSON copied");
  }, [jsonDisplayValue]);

  const applyJsonFromTextarea = useCallback(() => {
    const toParse = editedJson ?? jsonString;
    try {
      const { rootKey, defs, skipped } = parseJsonInputToLayoutDefs(
        toParse,
        sectionRootKey.trim() || "section",
      );
      const hydrated = layoutFieldDefsToHydratedBlocks(defs) as SectionBlock[];
      setBlocks(hydrated);
      setSectionRootKey(rootKey);
      setEditedJson(null);
      if (skipped > 0) {
        toast.info(
          `Applied. ${skipped} field(s) with invalid types were skipped.`,
        );
      } else {
        toast.success("Field tree updated from JSON");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse JSON");
    }
  }, [editedJson, jsonString, sectionRootKey]);

  const savePending = createLayout.isPending || updateLayout.isPending;

  const handlePublish = useCallback(async () => {
    if (publishLockRef.current) return;
    publishLockRef.current = true;
    setIsPublishing(true);
    try {
      if (blocks.length === 0) {
        toast.error("Add at least one field before publishing.");
        return;
      }
      if (hasEmptyKeyRecursive(blocks)) {
        toast.error("Every field needs a key before publishing.");
        return;
      }
      const rootTrimmed = sectionRootKey.trim();
      if (rootTrimmed !== "" && !isValidSectionRootKey(rootTrimmed)) {
        toast.error(
          "Section name must be snake_case (e.g. hero_banner). Use lowercase letters, numbers, and underscores only—no spaces.",
        );
        return;
      }
      const rootKey = rootTrimmed || "section";
      const schema = buildExportJson(blocks, sectionRootKey);
      const name = layoutName.trim() || rootKey;
      let ref = referenceImageUrl.trim();
      // Always store only the path, not a full URL
      if (ref.startsWith("http://") || ref.startsWith("https://")) {
        ref = stripDomain(ref);
      }
      if (pendingReferenceImageFile) {
        const slug = currentProject?.slug;
        if (!slug) {
          throw new Error(
            "Project context not identified. Cannot upload reference image.",
          );
        }
        ref = await uploadCmsReferenceImage(pendingReferenceImageFile, slug);
      }

      if (isEdit && layoutId) {
        await updateLayout.mutateAsync({
          id: layoutId,
          data: {
            name,
            rootKey,
            schema,
            referenceImageUrl: ref ? ref : null,
          },
        });
        setPendingReferenceImageFile(null);
        if (returnToRaw) {
          const path = decodeURIComponent(returnToRaw);
          router.push(appendAddLayoutIdToUrl(path, layoutId));
        }
        return;
      }

      const res = await createLayout.mutateAsync({
        name,
        rootKey,
        schema,
        ...(ref ? { referenceImageUrl: ref } : {}),
      });
      setPendingReferenceImageFile(null);
      if (returnToRaw) {
        const path = decodeURIComponent(returnToRaw);
        router.push(appendAddLayoutIdToUrl(path, res.layout.id));
        return;
      }

      setBlocks([]);
      setSectionRootKey("section");
      setLayoutName("");
      setReferenceImageUrl("");
      setEditedJson(null);
    } finally {
      publishLockRef.current = false;
      setIsPublishing(false);
    }
  }, [
    blocks,
    sectionRootKey,
    layoutName,
    referenceImageUrl,
    pendingReferenceImageFile,
    createLayout,
    updateLayout,
    isEdit,
    layoutId,
    currentProject?.slug,
    returnToRaw,
    router,
  ]);

  useSaveShortcut(
    () => {
      if (savePending || isPublishing || sectionRootKeyInvalid) return;
      void handlePublish();
    },
    { enabled: true },
  );

  const isEmpty = blocks.length === 0;
  const rootDuplicates = useMemo(() => duplicateKeysAmong(blocks), [blocks]);
  const sectionRootKeyTrimmed = sectionRootKey.trim();
  const sectionRootKeyInvalid =
    sectionRootKeyTrimmed !== "" &&
    !isValidSectionRootKey(sectionRootKeyTrimmed);

  if (mode === "edit" && !layoutId) {
    return (
      <div className="w-full max-w-none px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Missing layout id. Use a valid layout URL.
        </div>
      </div>
    );
  }

  if (isEdit && layoutQuery.isLoading) {
    return (
      <div className="flex w-full max-w-none flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading layout…</p>
        </div>
      </div>
    );
  }

  if (isEdit && layoutQuery.isError) {
    return (
      <div className="flex w-full max-w-none flex-col gap-4 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {layoutQuery.error instanceof Error
            ? layoutQuery.error.message
            : "Failed to load layout."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-8 px-4 pb-10 sm:px-6 lg:px-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="font-mono text-muted-foreground">{"{"}</span>
              <span className="mx-1 font-mono text-primary">
                {sectionRootKey.trim() || "section"}
              </span>
              <span className="font-mono text-muted-foreground">{"}"}</span>
            </h1>
            <Badge
              variant="secondary"
              className="font-mono text-xs font-normal"
            >
              schema
            </Badge>
            {isEdit ? (
              <Badge variant="outline" className="text-xs font-normal">
                Edit
              </Badge>
            ) : null}
          </div>
          <Button
            type="button"
            className="gap-2"
            onClick={handlePublish}
            disabled={savePending || isPublishing || sectionRootKeyInvalid}
          >
            {savePending || isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {isEdit ? "Save changes" : "Publish"}
          </Button>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <div className="min-w-0 flex-1 space-y-4 lg:max-w-md">
            <div className="space-y-2">
              <div className="space-y-1">
                <label
                  htmlFor="layout-display-name"
                  className="text-sm font-medium leading-none"
                >
                  Layout name
                </label>
                <p className="text-xs text-muted-foreground">
                  Shown in the dashboard and layout picker. Defaults to the root
                  key if left empty.
                </p>
              </div>
              <Input
                id="layout-display-name"
                value={layoutName}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setLayoutName(nextName);
                  if (!isEdit && !isSectionRootKeyManual) {
                    setSectionRootKey(sanitizeSectionRootKeyInput(nextName) || "section");
                  }
                }}
                placeholder="e.g. Blog section"
                spellCheck={false}
                className="text-sm"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <label
                  htmlFor="section-root-key"
                  className="text-sm font-medium leading-none"
                >
                  Section name (root key)
                </label>
                <p className="text-xs text-muted-foreground">
                  Top-level JSON key for this unit. Use{" "}
                  <span className="font-mono">snake_case</span> (e.g.{" "}
                  <span className="font-mono">hero_banner</span>)—spaces and
                  hyphens become underscores. Empty falls back to{" "}
                  <span className="font-mono">section</span>.
                </p>
              </div>
              <Input
                id="section-root-key"
                value={sectionRootKey}
                onChange={(e) => {
                  setIsSectionRootKeyManual(true);
                  setSectionRootKey(sanitizeSectionRootKeyInput(e.target.value));
                }}
                placeholder="hero_banner"
                spellCheck={false}
                className={cn(
                  "font-mono text-sm",
                  sectionRootKeyInvalid &&
                    "border-destructive focus-visible:ring-destructive/30",
                )}
                aria-invalid={sectionRootKeyInvalid}
                autoComplete="off"
              />
              {sectionRootKeyInvalid ? (
                <p className="text-xs text-destructive" role="alert">
                  Use snake_case: start with a letter, then letters, numbers, or
                  underscores (e.g. hero_banner).
                </p>
              ) : null}
            </div>
            <CmsReferenceScreenshotField
              inputId="layout-reference-image"
              label="Reference screenshot (optional)"
              value={referenceImageUrl}
              onChange={setReferenceImageUrl}
              uploadStrategy="deferred"
              deferredFile={pendingReferenceImageFile}
              onDeferredFileChange={setPendingReferenceImageFile}
              description={
                <>
                  Wireframe or mockup for editors. Saved on the layout record,
                  not inside the schema JSON. Upload stores under the media
                  folder <span className="font-mono">cms</span>; you can also
                  pick from the library or add a link (
                  <span className="font-mono">/uploads/cms/…</span>,{" "}
                  <span className="font-mono">https://…</span>). Large preview
                  on the right.
                </>
              }
            />
          </div>

          <div className="flex min-h-[min(50vh,420px)] min-w-0 w-full flex-1 flex-col lg:min-h-0 lg:aspect-16/10 ">
            {referenceImageUrl || pendingReferencePreviewUrl ? (
              <div className="flex h-full min-h-[min(50vh,420px)] min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
                <div className="shrink-0 border-b bg-muted/50 px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Reference preview
                  </p>
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/20 p-3">
                  <Image
                    src={
                      pendingReferencePreviewUrl ||
                      absoluteApiUrl(referenceImageUrl)
                    }
                    alt="Reference screenshot"
                    width={1920}
                    height={1080}
                    className="max-h-full max-w-full object-contain object-center"
                    unoptimized={Boolean(
                      pendingReferencePreviewUrl?.startsWith("blob:"),
                    )}
                    sizes="(max-width: 1024px) 100vw, min(720px, 55vw)"
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[min(50vh,420px)] min-w-0 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/15 px-4 py-10 text-center lg:min-h-0">
                <ImageIcon className="mb-2 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Large preview appears here when you upload, pick from the
                  library, or add a link.
                </p>
              </div>
            )}
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Each field has a{" "}
          <span className="font-mono text-foreground/80">key</span> (camelCase)
          used in JSON. Use{" "}
          <span className="font-medium text-foreground">Required</span> so
          editors must fill the field before saving the page. Optional{" "}
          <span className="font-mono text-foreground/80">default</span> values
          prefill new pages and new fields.{" "}
          <span className="font-medium text-foreground">Text area</span> is
          plain multi-line text;{" "}
          <span className="font-medium text-foreground">Description</span> is
          rich HTML. Arrays and objects use{" "}
          <span className="font-mono text-foreground/80">fields</span> for
          nested shapes.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
        <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b bg-muted/40 px-4 py-3">
            <h2 className="text-sm font-semibold">Field tree</h2>
            <p className="text-xs text-muted-foreground">
              Edit keys inline. Use the grip to drag, or arrows to move within
              the same level. Duplicate keys at the same level are highlighted.
            </p>
          </div>

          <ScrollArea className="max-h-[min(52vh,560px)]">
            <div className="p-4">
              {isEmpty ? (
                <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Add fields below — set{" "}
                    <span className="font-mono">key</span> names to match your
                    API.
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={blocks.map((b) => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2">
                      {blocks.map((block, i) => (
                        <LayoutBuilderBlockBranch
                          key={block.id}
                          block={block}
                          depth={0}
                          siblingIndex={i}
                          siblingCount={blocks.length}
                          duplicateKey={
                            !!block.key.trim() &&
                            rootDuplicates.has(block.key.trim())
                          }
                          onRemove={removeBlock}
                          onAddIntoContainer={addIntoContainer}
                          onAddCustomIntoContainer={addCustomIntoContainer}
                          onKeyChange={setBlockKey}
                          onDefaultChange={setBlockDefault}
                          onDefaultLinkChange={setBlockDefaultLink}
                          onRequiredChange={setBlockRequired}
                          onCollectionKeyChange={setBlockCollectionKey}
                          onCollectionMultipleChange={setBlockCollectionMultiple}
                          onSelectOptionsChange={setBlockSelectOptions}
                          onMoveBlock={moveBlock}
                          customTools={Object.values(
                            customToolsQuery.data?.tools ?? {},
                          )}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </ScrollArea>

          <div className="border-t bg-muted/30 p-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Add field
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Includes{" "}
              <span className="font-medium text-foreground">Text area</span>{" "}
              (plain multi-line) and{" "}
              <span className="font-medium text-foreground">Description</span>{" "}
              (rich HTML).
            </p>
            <LayoutBuilderGroupedToolPalette
              onPick={addRoot}
              customTools={Object.values(customToolsQuery.data?.tools ?? {})}
              onPickCustom={addCustomRoot}
            />
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Live JSON</h2>
              <p className="text-xs text-muted-foreground">
                Edit keys and fields in the tree, or paste JSON below and click
                Apply to structure the tree
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={applyJsonFromTextarea}
              >
                Apply
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={copyJson}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          </div>
          <ScrollArea className="max-h-[min(60vh,640px)]">
            <textarea
              value={jsonDisplayValue}
              onChange={(e) => setEditedJson(e.target.value)}
              spellCheck={false}
              className="min-h-[min(60vh,640px)] w-full resize-y bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100 caret-zinc-100 placeholder:text-zinc-500 focus:outline-none dark:bg-zinc-900 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              placeholder='Paste schema JSON, e.g. { "type": "array", "key": "footer_links", "fields": [...] }'
            />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export function LayoutBuilderPage(props: LayoutBuilderProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LayoutBuilder {...props} />
    </Suspense>
  );
}
