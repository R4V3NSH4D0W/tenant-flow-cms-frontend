"use client";

import { useCallback, useMemo, useState } from "react";
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
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Database, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { LayoutBuilderBlockBranch } from "@/components/cms/layout-builder/block-branch";
import { LayoutBuilderGroupedToolPalette } from "@/components/cms/layout-builder/grouped-tool-palette";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useCmsCollections,
  useUpsertCmsCollection,
} from "@/hooks/use-cms";
import { useSaveShortcut } from "@/hooks/use-save-shortcut";
import type { CmsCollectionDefinition } from "@/lib/cms/api";
import {
  addChildToContainer,
  createBlock,
  createBlockFromCustomTool,
  duplicateKeysAmong,
  hasEmptyKeyRecursive,
  moveBlockSibling,
  removeBlockById,
  reorderBlockSiblings,
  sanitizeSectionRootKeyInput,
  siblingKeysFrom,
  updateBlockCollectionKey,
  updateBlockCollectionMultiple,
  updateBlockDefault,
  updateBlockDefaultLink,
  updateBlockKey,
  updateBlockRequired,
  type SectionBlock,
  type SectionBlockType,
} from "@/lib/cms/layout-builder";

function blockToSchemaNode(block: SectionBlock): Record<string, unknown> {
  if (block.type === "array" || block.type === "object") {
    return {
      type: block.type,
      key: block.key.trim(),
      fields: block.children.map((child) => blockToSchemaNode(child)),
      ...(block.required ? { required: true } : {}),
    };
  }
  if (block.type === "link") {
    return {
      type: "link",
      key: block.key.trim(),
      ...(block.defaultLink ? { default: block.defaultLink } : {}),
      ...(block.required ? { required: true } : {}),
    };
  }
  if (block.type === "collection_ref") {
    return {
      type: "collection_ref",
      key: block.key.trim(),
      collectionKey: block.collectionKey?.trim() || "",
      multiple: block.multiple !== false,
      ...(block.required ? { required: true } : {}),
    };
  }
  return {
    type: block.type,
    key: block.key.trim(),
    ...(block.defaultStr ? { default: block.defaultStr } : {}),
    ...(block.required ? { required: true } : {}),
  };
}

function toSchemaJson(blocks: SectionBlock[]) {
  return {
    type: "object",
    key: "item",
    fields: blocks.map((b) => blockToSchemaNode(b)),
  };
}

function parseSchemaBlocks(schema: Record<string, unknown>): SectionBlock[] {
  const maybeFields = Array.isArray(schema.fields)
    ? schema.fields
    : Array.isArray(schema.children)
      ? schema.children
      : [];
  const siblingKeys = new Set<string>();
  return maybeFields.map((field) => {
    const block = createBlockFromCustomTool(field, 0, siblingKeys);
    siblingKeys.add(block.key.trim());
    return block;
  });
}

export default function CmsCollectionBuilderPage() {
  const searchParams = useSearchParams();
  const queryKey = (searchParams.get("key") ?? "").trim().toLowerCase();

  const { data: defsRes } = useCmsCollections();
  const upsertCollection = useUpsertCmsCollection();

  const collections = useMemo(() => defsRes?.collections ?? [], [defsRes?.collections]);
  const initialCollection = useMemo(
    () => collections.find((c) => c.key === queryKey),
    [collections, queryKey],
  );
  const editorSessionKey = initialCollection?.id
    ? `edit:${initialCollection.id}`
    : queryKey
      ? `new:${queryKey}`
      : "new:blank";

  return (
    <CollectionBuilderEditor
      key={editorSessionKey}
      queryKey={queryKey}
      initialCollection={initialCollection}
      isSaving={upsertCollection.isPending}
      onSave={async ({ key, name, schema }) =>
        upsertCollection.mutateAsync({ key, data: { name, schema } })
      }
    />
  );
}

function CollectionBuilderEditor({
  queryKey,
  initialCollection,
  isSaving,
  onSave,
}: {
  queryKey: string;
  initialCollection?: CmsCollectionDefinition;
  isSaving: boolean;
  onSave: (args: {
    key: string;
    name: string;
    schema: Record<string, unknown>;
  }) => Promise<unknown>;
}) {
  const initialKey = initialCollection?.key ?? queryKey;
  const initialName = initialCollection?.name ?? "";
  const initialBlocks = initialCollection
    ? parseSchemaBlocks(initialCollection.schema)
    : [];

  const [name, setName] = useState(initialName);
  const [collectionKey, setCollectionKey] = useState(initialKey);
  const [isKeyManual, setIsKeyManual] = useState(Boolean(initialCollection || queryKey));
  const [blocks, setBlocks] = useState<SectionBlock[]>(initialBlocks);
  const isEditingExisting = Boolean(initialCollection);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const addRoot = useCallback((type: SectionBlockType) => {
    setBlocks((prev) => {
      const keys = siblingKeysFrom(prev);
      return [...prev, createBlock(type, 0, keys)];
    });
  }, []);

  const addIntoContainer = useCallback(
    (containerId: string, type: SectionBlockType, childDepth: number) => {
      setBlocks((prev) => addChildToContainer(prev, containerId, type, childDepth));
    },
    [],
  );

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => removeBlockById(prev, id));
  }, []);

  const setBlockKey = useCallback((id: string, key: string) => {
    setBlocks((prev) => updateBlockKey(prev, id, key));
  }, []);

  const setBlockDefault = useCallback((id: string, value: string | undefined) => {
    setBlocks((prev) => updateBlockDefault(prev, id, value));
  }, []);

  const setBlockDefaultLink = useCallback(
    (id: string, value: { value: string; href: string; target: string }) => {
      setBlocks((prev) => updateBlockDefaultLink(prev, id, value));
    },
    [],
  );

  const setBlockRequired = useCallback((id: string, required: boolean) => {
    setBlocks((prev) => updateBlockRequired(prev, id, required));
  }, []);

  const setBlockCollectionKey = useCallback((id: string, key: string) => {
    setBlocks((prev) => updateBlockCollectionKey(prev, id, key));
  }, []);

  const setBlockCollectionMultiple = useCallback((id: string, multiple: boolean) => {
    setBlocks((prev) => updateBlockCollectionMultiple(prev, id, multiple));
  }, []);

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    setBlocks((prev) => moveBlockSibling(prev, id, direction));
  }, []);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => reorderBlockSiblings(prev, String(active.id), String(over.id)));
  }, []);

  const duplicateRootKeys = useMemo(() => duplicateKeysAmong(blocks), [blocks]);

  async function handleSave() {
    const key = sanitizeSectionRootKeyInput(collectionKey).trim();
    if (!name.trim()) {
      toast.error("Collection name is required");
      return;
    }
    if (!key) {
      toast.error("Collection key is required");
      return;
    }
    if (duplicateRootKeys.size > 0 || hasEmptyKeyRecursive(blocks)) {
      toast.error("Fix duplicate or empty field keys before saving");
      return;
    }
    await onSave({
      key,
      name: name.trim(),
      schema: toSchemaJson(blocks),
    });
  }

  useSaveShortcut(async () => {
    await handleSave();
  }, { enabled: !isSaving });

  return (
    <div className="flex w-full flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
            <Link href="/dashboard/cms/collections">← Collections</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Collection Builder</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Build collection schema visually with flexible field types.
          </p>
        </div>
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save collection
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Collection Meta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Name</p>
            <Input
              value={name}
              onChange={(e) => {
                const nextName = e.target.value;
                setName(nextName);
                if (!isKeyManual) {
                  setCollectionKey(sanitizeSectionRootKeyInput(nextName));
                }
              }}
              placeholder="Collection name"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Key (snake_case)</p>
            <Input
              value={collectionKey}
              onChange={(e) => {
                const next = sanitizeSectionRootKeyInput(e.target.value);
                setCollectionKey(next);
                setIsKeyManual(true);
              }}
              placeholder="team_members"
              spellCheck={false}
              disabled={isEditingExisting}
            />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Add Fields
        </p>
        <LayoutBuilderGroupedToolPalette onPick={addRoot} customTools={[]} />
      </div>

      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No schema fields yet. Add your first field type above.
        </p>
      ) : (
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {blocks.map((block, index) => (
                <LayoutBuilderBlockBranch
                  key={block.id}
                  block={block}
                  depth={0}
                  siblingIndex={index}
                  siblingCount={blocks.length}
                  duplicateKey={duplicateRootKeys.has(block.key.trim())}
                  onRemove={removeBlock}
                  onAddIntoContainer={addIntoContainer}
                  onAddCustomIntoContainer={() => undefined}
                  onKeyChange={setBlockKey}
                  onDefaultChange={setBlockDefault}
                  onDefaultLinkChange={setBlockDefaultLink}
                  onRequiredChange={setBlockRequired}
                  onCollectionKeyChange={setBlockCollectionKey}
                  onCollectionMultipleChange={setBlockCollectionMultiple}
                  onMoveBlock={moveBlock}
                  customTools={[]}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
