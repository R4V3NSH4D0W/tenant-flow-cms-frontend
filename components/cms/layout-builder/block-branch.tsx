"use client";

import { useMemo, type ReactNode } from "react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import { FiChevronDown, FiChevronUp, FiMenu } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CmsCustomTool } from "@/lib/cms/api";
import { cn } from "@/lib/shared/utils";
import { useCmsCollections } from "@/hooks/use-cms";
import {
  TYPE_LABEL,
  duplicateKeysAmong,
  isContainer,
  type SectionBlock,
  type SectionBlockType,
} from "@/lib/cms/layout-builder";
import { LayoutBuilderLeafDefaultField } from "./leaf-default-field";
import {
  LayoutBuilderBlockTypeBadge,
  LayoutBuilderBlockTypeIcon,
} from "./block-type-badge";
import { LayoutBuilderGroupedToolPalette } from "./grouped-tool-palette";

function LayoutBuilderBlockRow({
  block,
  depth,
  siblingIndex,
  siblingCount,
  duplicateKey,
  hideFieldKey,
  onRemove,
  onMoveBlock,
  onKeyChange,
  onDefaultChange,
  onDefaultLinkChange,
  onRequiredChange,
  onCollectionKeyChange,
  onCollectionMultipleChange,
  childrenBelow,
}: {
  block: SectionBlock;
  depth: number;
  siblingIndex: number;
  siblingCount: number;
  duplicateKey: boolean;
  /** When true (fields inside an Array), JSON uses the array key only; item fields are merged flat. */
  hideFieldKey?: boolean;
  onRemove: (id: string) => void;
  onMoveBlock: (id: string, direction: "up" | "down") => void;
  onKeyChange: (id: string, key: string) => void;
  onDefaultChange: (id: string, value: string | undefined) => void;
  onDefaultLinkChange: (
    id: string,
    next: { value: string; href: string; target: string },
  ) => void;
  onRequiredChange: (id: string, required: boolean) => void;
  onCollectionKeyChange: (id: string, key: string) => void;
  onCollectionMultipleChange: (id: string, multiple: boolean) => void;
  childrenBelow?: ReactNode;
}) {
  const isLeaf = !isContainer(block.type);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const canMoveUp = siblingIndex > 0;
  const canMoveDown = siblingIndex < siblingCount - 1;
  const isRoot = depth === 0;
  const { data: collectionsRes } = useCmsCollections();
  const collectionKeys = (collectionsRes?.collections ?? []).map((c) => c.key);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("list-none", isDragging && "z-10 opacity-60")}
    >
      <div
        className={cn(
          "group flex flex-col gap-2 rounded-lg border px-3 py-2.5 transition-colors sm:flex-row sm:items-start sm:justify-between",
          isRoot
            ? "border-border bg-background"
            : "border-dashed border-muted-foreground/25 bg-muted/30",
          !isRoot && "ml-1",
        )}
        style={{ marginLeft: !isRoot ? depth * 10 : undefined }}
      >
        <div className="flex min-w-0 flex-1 gap-2">
          <div className="flex shrink-0 flex-col gap-0.5 pt-0.5 sm:flex-row sm:items-center sm:gap-0.5">
            <button
              type="button"
              className={cn(
                "flex h-8 w-8 cursor-grab touch-manipulation items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                "active:cursor-grabbing",
              )}
              aria-label="Drag to reorder field"
              {...attributes}
              {...listeners}
            >
              <FiMenu className="h-4 w-4 shrink-0" aria-hidden />
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Move field up"
              disabled={!canMoveUp}
              onClick={() => onMoveBlock(block.id, "up")}
            >
              <FiChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Move field down"
              disabled={!canMoveDown}
              onClick={() => onMoveBlock(block.id, "down")}
            >
              <FiChevronDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex shrink-0 items-center gap-2">
                <LayoutBuilderBlockTypeBadge type={block.type} />
                <LayoutBuilderBlockTypeIcon type={block.type} />
                <span className="text-sm font-medium">
                  {TYPE_LABEL[block.type]}
                </span>
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {hideFieldKey ? (
                  <span className="min-w-0 break-all font-mono text-xs text-muted-foreground">
                    <span className="sr-only">Field key </span>
                    {block.key.trim() || "(unnamed)"}
                  </span>
                ) : (
                  <>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      key
                    </span>
                    <Input
                      value={block.key}
                      onChange={(e) => onKeyChange(block.id, e.target.value)}
                      placeholder="fieldName"
                      spellCheck={false}
                      className={cn(
                        "h-8 min-w-0 font-mono text-xs",
                        duplicateKey &&
                          "border-destructive focus-visible:ring-destructive/30",
                        !block.key.trim() && "border-amber-500/50",
                      )}
                      aria-invalid={duplicateKey || !block.key.trim()}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Checkbox
                id={`cms-layout-req-${block.id}`}
                checked={block.required === true}
                onCheckedChange={(c) => onRequiredChange(block.id, c === true)}
              />
              <Label
                htmlFor={`cms-layout-req-${block.id}`}
                className="cursor-pointer text-xs font-normal text-muted-foreground"
              >
                Required
              </Label>
            </div>
            {block.type === "collection_ref" ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Source</span>
                <Select
                  value={block.collectionKey?.trim() || "testimonials"}
                  onValueChange={(next) => onCollectionKeyChange(block.id, next)}
                >
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(collectionKeys.length > 0 ? collectionKeys : ["testimonials"]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`cms-layout-ref-multi-${block.id}`}
                    checked={block.multiple !== false}
                    onCheckedChange={(c) =>
                      onCollectionMultipleChange(block.id, c === true)
                    }
                  />
                  <Label
                    htmlFor={`cms-layout-ref-multi-${block.id}`}
                    className="cursor-pointer text-xs font-normal text-muted-foreground"
                  >
                    Allow multiple
                  </Label>
                </div>
                <p className="basis-full text-[11px] text-muted-foreground">
                  Allow multiple stores an array of selected item IDs. Off stores
                  one selected item ID. Collection refs do not use schema
                  defaults; editors choose references in the CMS form.
                </p>
              </div>
            ) : null}
            {isLeaf && block.type !== "collection_ref" ? (
              <div className="max-w-full border-t border-dashed border-muted-foreground/20 pt-2">
                <LayoutBuilderLeafDefaultField
                  block={block}
                  onChange={onDefaultChange}
                  onLinkChange={onDefaultLinkChange}
                />
              </div>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 self-end opacity-60 hover:opacity-100 sm:self-start"
          aria-label={`Remove ${TYPE_LABEL[block.type]}`}
          onClick={() => onRemove(block.id)}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>

      {childrenBelow}
    </li>
  );
}

export function LayoutBuilderBlockBranch({
  block,
  depth,
  siblingIndex,
  siblingCount,
  duplicateKey,
  parentContainerType,
  onRemove,
  onAddIntoContainer,
  onAddCustomIntoContainer,
  onKeyChange,
  onDefaultChange,
  onDefaultLinkChange,
  onRequiredChange,
  onCollectionKeyChange,
  onCollectionMultipleChange,
  onMoveBlock,
  customTools,
}: {
  block: SectionBlock;
  depth: number;
  siblingIndex: number;
  siblingCount: number;
  duplicateKey: boolean;
  /** Parent container type, used for per-container UI behavior. */
  parentContainerType?: "array" | "object" | null;
  onRemove: (id: string) => void;
  onAddIntoContainer: (
    containerId: string,
    type: SectionBlockType,
    childDepth: number,
  ) => void;
  onAddCustomIntoContainer: (
    containerId: string,
    tool: CmsCustomTool,
    childDepth: number,
  ) => void;
  onKeyChange: (id: string, key: string) => void;
  onDefaultChange: (id: string, value: string | undefined) => void;
  onDefaultLinkChange: (
    id: string,
    next: { value: string; href: string; target: string },
  ) => void;
  onRequiredChange: (id: string, required: boolean) => void;
  onCollectionKeyChange: (id: string, key: string) => void;
  onCollectionMultipleChange: (id: string, multiple: boolean) => void;
  onMoveBlock: (id: string, direction: "up" | "down") => void;
  customTools?: CmsCustomTool[];
}) {
  const container = isContainer(block.type);
  const childDepth = depth + 1;
  const childDuplicates = useMemo(
    () => duplicateKeysAmong(block.children),
    [block.children],
  );

  const childIds = block.children.map((c) => c.id);

  const nestedSection = container ? (
    <div
      className="mt-2 space-y-3 border-l-2 border-primary/20 pl-3"
      style={{ marginLeft: depth * 10 + 6 }}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {block.type === "array"
          ? "Each item (fields)"
          : "Object properties (fields)"}
      </p>
      {block.children.length === 0 ? (
        <p className="rounded-md bg-muted/50 px-2 py-2 text-xs text-muted-foreground">
          {block.type === "array"
            ? "Add fields for each repeated item."
            : "Add named properties for this object."}
        </p>
      ) : (
        <SortableContext
          items={childIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {block.children.map((child, i) => (
              <LayoutBuilderBlockBranch
                key={child.id}
                block={child}
                depth={childDepth}
                siblingIndex={i}
                siblingCount={block.children.length}
                duplicateKey={
                  !!child.key.trim() && childDuplicates.has(child.key.trim())
                }
                parentContainerType={
                  block.type as "object" | "array" | null | undefined
                }
                onRemove={onRemove}
                onAddIntoContainer={onAddIntoContainer}
                onAddCustomIntoContainer={onAddCustomIntoContainer}
                onKeyChange={onKeyChange}
                onDefaultChange={onDefaultChange}
                onDefaultLinkChange={onDefaultLinkChange}
                onRequiredChange={onRequiredChange}
                onCollectionKeyChange={onCollectionKeyChange}
                onCollectionMultipleChange={onCollectionMultipleChange}
                onMoveBlock={onMoveBlock}
                customTools={customTools}
              />
            ))}
          </ul>
        </SortableContext>
      )}
      <div className="rounded-lg bg-muted/40 p-3 pt-2">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Add to this {block.type}
        </p>
        <LayoutBuilderGroupedToolPalette
          onPick={(type) => onAddIntoContainer(block.id, type, childDepth)}
          customTools={customTools}
          onPickCustom={(tool) =>
            onAddCustomIntoContainer(block.id, tool, childDepth)
          }
        />
      </div>
    </div>
  ) : null;

  return (
    <LayoutBuilderBlockRow
      block={block}
      depth={depth}
      siblingIndex={siblingIndex}
      siblingCount={siblingCount}
      duplicateKey={duplicateKey}
      hideFieldKey={false}
      onRemove={onRemove}
      onMoveBlock={onMoveBlock}
      onKeyChange={onKeyChange}
      onDefaultChange={onDefaultChange}
      onDefaultLinkChange={onDefaultLinkChange}
      onRequiredChange={onRequiredChange}
      onCollectionKeyChange={onCollectionKeyChange}
      onCollectionMultipleChange={onCollectionMultipleChange}
      childrenBelow={nestedSection}
    />
  );
}
