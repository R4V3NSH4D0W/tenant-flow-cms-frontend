"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImageOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { LayoutConfigForm } from "@/components/cms/layout-config-form";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCmsCollections,
  useCmsCollectionItems,
  useCreateCmsCollectionItem,
  useDeleteCmsCollectionItem,
  useUpdateCmsCollectionItem,
} from "@/hooks/use-cms";
import { absoluteApiUrl, absoluteTenantApiUrl } from "@/lib/cms/absolute-url";
import { type CmsCollectionItem, cmsApi } from "@/lib/cms/api";
import {
  findCollectionItemPreviewImage,
  titleFromImageUrl,
  type CmsCollectionItemPreviewImage,
} from "@/lib/cms/collection-item-image";
import { publicCmsCollectionApiPath } from "@/lib/cms/public-site-api-paths";
import { parseFieldDefs, type LayoutFieldDef } from "@/lib/cms/layout-payload";

type CollectionItemStatusFilter =
  | "all"
  | "published"
  | "draft"
  | "active"
  | "inactive";

function defaultLeafValue(def: LayoutFieldDef): unknown {
  if (def.default !== undefined) return def.default;
  switch (def.type) {
    case "boolean":
      return false;
    case "number":
      return 0;
    case "link":
      return { value: "", href: "", target: "_self" };
    case "collection_ref":
      return def.multiple === false ? "" : [];
    default:
      return "";
  }
}

function buildDefaults(defs: LayoutFieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const def of defs) {
    const key = def.key?.trim();
    if (!key) continue;
    if (def.type === "object") {
      out[key] = buildDefaults(def.fields ?? []);
      continue;
    }
    if (def.type === "array") {
      out[key] = [buildDefaults(def.fields ?? [])];
      continue;
    }
    out[key] = defaultLeafValue(def);
  }
  return out;
}

function deriveTitleFromPayload(payload: Record<string, unknown>, fallbackKey: string): string {
  const preferred = ["title", "name", "label", "heading"];
  for (const key of preferred) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const previewImage = findCollectionItemPreviewImage(payload);
  if (previewImage) {
    const imageTitle = titleFromImageUrl(previewImage.url);
    if (imageTitle) return imageTitle;
  }
  for (const value of Object.values(payload)) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return `${fallbackKey} item`;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(input: string, max = 96): string {
  return input.length <= max ? input : `${input.slice(0, max - 1)}…`;
}

function previewTextForValue(type: string, value: unknown): string {
  if (value == null) return "";
  if (type === "description" && typeof value === "string") {
    return truncate(stripHtml(value));
  }
  if (type === "boolean") {
    return value === true ? "Yes" : value === false ? "No" : "";
  }
  if (type === "link" && typeof value === "object" && !Array.isArray(value)) {
    const link = value as Record<string, unknown>;
    const label = typeof link.value === "string" ? link.value.trim() : "";
    const href = typeof link.href === "string" ? link.href.trim() : "";
    return truncate(label || href);
  }
  if (type === "collection_ref") {
    if (Array.isArray(value)) return `${value.length} linked`;
    if (typeof value === "string" && value.trim()) return truncate(value);
    return "";
  }
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (typeof value === "object") {
    return truncate(JSON.stringify(value));
  }
  return truncate(String(value));
}

function buildPreviewRows(
  defs: LayoutFieldDef[],
  payload: Record<string, unknown>,
  maxRows = 5,
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];

  const walk = (innerDefs: LayoutFieldDef[], current: Record<string, unknown>) => {
    for (const def of innerDefs) {
      if (rows.length >= maxRows) return;
      const key = def.key?.trim();
      if (!key) continue;
      const value = current[key];
      if (def.type === "object") {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          walk(def.fields ?? [], value as Record<string, unknown>);
        }
        continue;
      }
      if (def.type === "array") {
        if (Array.isArray(value)) {
          rows.push({
            label: key,
            value: `${value.length} item${value.length === 1 ? "" : "s"}`,
          });
        }
        continue;
      }
      const text = previewTextForValue(def.type, value);
      if (text) rows.push({ label: key, value: text });
    }
  };

  walk(defs, payload);
  if (rows.length > 0) return rows;

  for (const [key, raw] of Object.entries(payload)) {
    if (rows.length >= maxRows) break;
    const text = previewTextForValue("", raw);
    if (!text) continue;
    rows.push({ label: key, value: text });
  }

  return rows;
}

function hasEmptyImageField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => hasEmptyImageField(entry));
  }
  if (!value || typeof value !== "object") return false;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/image|thumbnail|photo|avatar|cover/i.test(key)) {
      if (typeof nested === "string" && nested.trim().length === 0) return true;
      if (nested == null) return true;
    }
    if (hasEmptyImageField(nested)) return true;
  }
  return false;
}

function itemMatchesSearch(
  item: CmsCollectionItem,
  previewRows: Array<{ label: string; value: string }>,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const previewText = previewRows
    .map((row) => `${row.label} ${row.value}`)
    .join(" ")
    .toLowerCase();
  return [item.title, item.slug ?? "", item.id, previewText].some((value) =>
    value.toLowerCase().includes(q),
  );
}

function itemMatchesStatusFilter(
  item: CmsCollectionItem,
  filter: CollectionItemStatusFilter,
): boolean {
  switch (filter) {
    case "published":
      return item.published;
    case "draft":
      return !item.published;
    case "active":
      return item.isActive;
    case "inactive":
      return !item.isActive;
    case "all":
    default:
      return true;
  }
}

function SortableCollectionCard({
  item,
  previewImage,
  previewRows,
  showImagePlaceholder,
  onEdit,
  onDelete,
  isBusy,
  canReorder,
}: {
  item: CmsCollectionItem;
  previewImage: CmsCollectionItemPreviewImage | null;
  previewRows: Array<{ label: string; value: string }>;
  showImagePlaceholder: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isBusy: boolean;
  canReorder: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`h-full ${isDragging ? "z-10 ring-1 ring-primary/40" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{item.title}</CardTitle>
          <button
            type="button"
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted disabled:cursor-default disabled:opacity-40"
            aria-label="Drag to reorder item"
            disabled={!canReorder}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant={item.published ? "default" : "secondary"}>
            {item.published ? "Published" : "Draft"}
          </Badge>
          <Badge variant={item.isActive ? "default" : "secondary"}>
            {item.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {previewImage || showImagePlaceholder ? (
          <div className="relative h-48 w-full overflow-hidden rounded-md border bg-muted/50">
            {previewImage ? (
              <Image
                src={absoluteApiUrl(previewImage.url)}
                alt={item.title}
                fill
                className="object-cover object-center"
                sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 90vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
                <ImageOff className="h-4 w-4" />
                <span>No image selected</span>
              </div>
            )}
          </div>
        ) : null}
        {previewRows.length > 0 ? (
          <div className="flex-1 rounded-md border bg-muted/30 p-2">
            {previewRows.map((row) => (
              <div key={`${item.id}-${row.label}`} className="py-1 text-xs">
                <span className="text-muted-foreground">{row.label}: </span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
        ) : previewImage ? null : (
          <p className="flex-1 text-xs text-muted-foreground">No previewable fields.</p>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDelete} disabled={isBusy}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CmsCollectionItemsPage() {
  const params = useParams<{ key: string }>();
  const collectionKey = decodeURIComponent(params.key ?? "").trim().toLowerCase();
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();
  const { data: defsRes } = useCmsCollections();
  const pageSize = 24;
  const [page, setPage] = useState(0);
  const offset = page * pageSize;

  const { data, isLoading } = useCmsCollectionItems(collectionKey, {
    includeInactive: true,
    includeDraft: true,
    sort: "displayOrderAsc",
    limit: pageSize,
    offset,
    enabled: !!collectionKey,
  });
  const createItem = useCreateCmsCollectionItem(collectionKey);
  const updateItem = useUpdateCmsCollectionItem(collectionKey);
  const deleteItem = useDeleteCmsCollectionItem(collectionKey);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const collectionDefinition = useMemo(
    () => (defsRes?.collections ?? []).find((c) => c.key === collectionKey),
    [defsRes?.collections, collectionKey],
  );
  const schemaDefs = useMemo(() => {
    const schema = collectionDefinition?.schema;
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) return [];
    const obj = schema as Record<string, unknown>;
    if (Array.isArray(obj.fields)) return parseFieldDefs(obj.fields);
    const rootKeys = Object.keys(obj);
    if (rootKeys.length > 0 && Array.isArray(obj[rootKeys[0] ?? ""])) {
      return parseFieldDefs(obj[rootKeys[0] ?? ""]);
    }
    return [];
  }, [collectionDefinition?.schema]);
  const schemaDefaults = useMemo(() => buildDefaults(schemaDefs), [schemaDefs]);
  const useVisualSchemaForm = schemaDefs.length > 0;
  const [isReordering, setIsReordering] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CmsCollectionItem[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CollectionItemStatusFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [payloadText, setPayloadText] = useState("{}");
  const [payloadValue, setPayloadValue] = useState<Record<string, unknown>>({});
  const [published, setPublished] = useState(true);
  const [active, setActive] = useState(true);
  const publicApiPath = publicCmsCollectionApiPath(collectionKey);
  const publicApiUrl = absoluteTenantApiUrl(publicApiPath, {
    slug: currentProject?.slug,
    primaryDomain: currentProject?.primaryDomain,
  });
  const hasMore = Boolean(data?.pagination?.hasMore);
  const isFirstPage = page === 0;

  useEffect(() => {
    if (!editingId) {
      setPayloadValue(schemaDefaults);
    }
  }, [editingId, schemaDefaults]);

  useEffect(() => {
    setPage(0);
  }, [collectionKey]);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  function resetForm() {
    setEditingId(null);
    setPayloadText("{}");
    setPayloadValue(schemaDefaults);
    setPublished(true);
    setActive(true);
    setEditorOpen(false);
  }

  function startNewItem() {
    setEditingId(null);
    setPayloadText("{}");
    setPayloadValue(schemaDefaults);
    setPublished(true);
    setActive(true);
    setEditorOpen(true);
  }

  function loadItemForEdit(item: (typeof items)[number]) {
    const payload = (item.payload ?? {}) as Record<string, unknown>;
    setEditingId(item.id);
    setPayloadText(JSON.stringify(payload, null, 2));
    setPayloadValue(payload);
    setPublished(item.published);
    setActive(item.isActive);
    setEditorOpen(true);
  }

  function parsePayloadOrThrow() {
    try {
      const raw = JSON.parse(payloadText || "{}");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("Payload must be a JSON object");
      }
      return raw as Record<string, unknown>;
    } catch {
      throw new Error("Payload JSON is invalid");
    }
  }

  async function handleSave() {
    let payload: Record<string, unknown> = payloadValue;
    if (!useVisualSchemaForm) {
      try {
        payload = parsePayloadOrThrow();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Invalid payload");
        return;
      }
    }
    const resolvedTitle = deriveTitleFromPayload(payload, collectionKey);

    if (editingId) {
      await updateItem.mutateAsync({
        id: editingId,
        data: {
          title: resolvedTitle,
          slug: null,
          payload,
          published,
          isActive: active,
        },
      });
      setEditorOpen(false);
      setEditingId(null);
      return;
    }

    await createItem.mutateAsync({
      title: resolvedTitle,
      payload,
      published,
      isActive: active,
    });
    setEditingId(null);
    setPayloadValue(schemaDefaults);
    setPublished(true);
    setActive(true);
  }

  const previewById = useMemo(() => {
    const map = new Map<
      string,
      {
        previewRows: Array<{ label: string; value: string }>;
        previewImage: CmsCollectionItemPreviewImage | null;
        showImagePlaceholder: boolean;
      }
    >();
    for (const item of orderedItems) {
      const payload =
        item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
          ? (item.payload as Record<string, unknown>)
          : {};
      map.set(item.id, {
        previewRows: buildPreviewRows(schemaDefs, payload),
        previewImage: findCollectionItemPreviewImage(payload),
        showImagePlaceholder: hasEmptyImageField(payload),
      });
    }
    return map;
  }, [orderedItems, schemaDefs]);

  const filteredItems = useMemo(
    () =>
      orderedItems.filter((item) => {
        if (!itemMatchesStatusFilter(item, statusFilter)) return false;
        const preview = previewById.get(item.id);
        return itemMatchesSearch(item, preview?.previewRows ?? [], search);
      }),
    [orderedItems, statusFilter, previewById, search],
  );

  const canReorder = statusFilter === "all" && search.trim() === "";

  async function persistOrder(nextItems: CmsCollectionItem[]) {
    if (!currentProject) return;
    setIsReordering(true);
    try {
      const updates = nextItems
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) => item.displayOrder !== offset + index)
        .map(({ item, index }) =>
          cmsApi.updateCollectionItem(currentProject.slug, collectionKey, item.id, {
            displayOrder: offset + index,
          }),
        );
      if (updates.length > 0) {
        await Promise.all(updates);
      }
      await queryClient.invalidateQueries({
        queryKey: ["cms-collections", currentProject.slug, collectionKey],
      });
    } finally {
      setIsReordering(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItems.findIndex((item) => item.id === String(active.id));
    const newIndex = orderedItems.findIndex((item) => item.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(orderedItems, oldIndex, newIndex);
    setOrderedItems(next);
    void persistOrder(next);
  }

  async function handleDeleteItem(item: CmsCollectionItem) {
    await deleteItem.mutateAsync(item.id);
    setOrderedItems((prev) => prev.filter((row) => row.id !== item.id));
    if (editingId === item.id) {
      setEditingId(null);
      setEditorOpen(false);
      setPayloadValue(schemaDefaults);
      setPublished(true);
      setActive(true);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
      <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
        <Link href="/dashboard/cms/collections">← All collections</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Collection: {collectionKey}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage reusable records for this collection.
          </p>
          <div className="mt-2 rounded-md border bg-muted/30 p-3 font-mono text-xs">
            <p className="font-sans text-xs text-muted-foreground">Public API</p>
            <p>{publicApiUrl}?limit=10&amp;offset=0</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link
              href={`/dashboard/cms/collections/builder?key=${encodeURIComponent(collectionKey)}`}
            >
              Edit schema
            </Link>
          </Button>
          <Button onClick={startNewItem}>
            <Plus className="mr-2 h-4 w-4" />
            New item
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              {editingId ? "Edit item" : "Create item"}
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditorOpen((prev) => !prev)}
            >
              {editorOpen ? (
                <ChevronUp className="mr-1 h-4 w-4" />
              ) : (
                <ChevronDown className="mr-1 h-4 w-4" />
              )}
              {editorOpen ? "Hide form" : "Show form"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editorOpen ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <Label>
                    {useVisualSchemaForm
                      ? "Collection fields"
                      : "Payload (JSON object)"}
                  </Label>
                  {useVisualSchemaForm ? (
                    <div className="rounded-md border p-3">
                      <LayoutConfigForm
                        rootKey="item"
                        defs={schemaDefs}
                        value={{ item: payloadValue }}
                        onChange={(next) => {
                          const itemValue = next.item;
                          if (
                            itemValue &&
                            typeof itemValue === "object" &&
                            !Array.isArray(itemValue)
                          ) {
                            setPayloadValue(itemValue as Record<string, unknown>);
                          } else {
                            setPayloadValue({});
                          }
                        }}
                        showRootKeyHint={false}
                      />
                    </div>
                  ) : (
                    <Textarea
                      value={payloadText}
                      onChange={(e) => setPayloadText(e.target.value)}
                      rows={8}
                      className="font-mono text-xs"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={published} onCheckedChange={setPublished} />
                  <span className="text-sm text-muted-foreground">Published</span>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={active} onCheckedChange={setActive} />
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={createItem.isPending || updateItem.isPending}
                >
                  {createItem.isPending || updateItem.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {editingId ? "Save changes" : "Create item"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  {editingId ? "Cancel edit" : "Close form"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Form hidden to keep browsing focused. Use{" "}
              <span className="font-medium">New item</span> or{" "}
              <span className="font-medium">Edit</span> to open it.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, slug, id, or preview text"
              className="w-[280px] max-w-full bg-background"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as CollectionItemStatusFilter)
              }
            >
              <SelectTrigger className="w-[170px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Showing {filteredItems.length} of {orderedItems.length} item(s) on
              page {page + 1}
            </span>
            {!canReorder ? (
              <Badge variant="secondary">Reorder disabled while filtering</Badge>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading items…
          </div>
        ) : orderedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No collection items yet.</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No items match your current search/filter on this page.
          </p>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-3">
            {canReorder ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredItems.map((item) => item.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map((item) => {
                      const preview = previewById.get(item.id);
                      return (
                        <SortableCollectionCard
                          key={item.id}
                          item={item}
                          previewImage={preview?.previewImage ?? null}
                          previewRows={preview?.previewRows ?? []}
                          showImagePlaceholder={preview?.showImagePlaceholder ?? false}
                          onEdit={() => loadItemForEdit(item)}
                          onDelete={() => void handleDeleteItem(item)}
                          isBusy={isReordering || deleteItem.isPending}
                          canReorder
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => {
                  const preview = previewById.get(item.id);
                  return (
                    <SortableCollectionCard
                      key={item.id}
                      item={item}
                      previewImage={preview?.previewImage ?? null}
                      previewRows={preview?.previewRows ?? []}
                      showImagePlaceholder={preview?.showImagePlaceholder ?? false}
                      onEdit={() => loadItemForEdit(item)}
                      onDelete={() => void handleDeleteItem(item)}
                      isBusy={deleteItem.isPending}
                      canReorder={false}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={isFirstPage || isLoading}
          >
            Previous page
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!hasMore || isLoading}
          >
            Next page
          </Button>
        </div>
      </div>
    </div>
  );
}
