"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutConfigForm } from "@/components/cms/layout-config-form";
import { useCmsLayout } from "@/hooks/use-cms";
import {
  buildPayloadTemplateFromSchema,
  mergeLayoutPayloadTemplate,
  parseLayoutSchema,
} from "@/lib/cms/layout-payload";
import type { CmsNewPageLayoutSlot } from "@/lib/cms/new-page-draft";
import type { CmsLayoutListItem } from "@/lib/cms/api";
import { cn } from "@/lib/shared/utils";

/**
 * Deep structural equality that is insensitive to key insertion order.
 * Uses sorted JSON serialisation so {a:1,b:2} === {b:2,a:1}.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(sortedKeys(a)) === JSON.stringify(sortedKeys(b));
  } catch {
    return false;
  }
}

function sortedKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(sortedKeys);
  if (val !== null && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortedKeys(obj[k]);
        return acc;
      }, {});
  }
  return val;
}

const NO_LAYOUT = "__none__";

function LayoutSlotBody({
  slot,
  disabled,
  onSlotPatch,
  hideLayoutSelect,
}: {
  slot: CmsNewPageLayoutSlot;
  disabled: boolean;
  onSlotPatch: (id: string, patch: Partial<CmsNewPageLayoutSlot>) => void;
  /** Matches slot card: compact hints + no root-key line when picking layout via Add layout. */
  hideLayoutSelect?: boolean;
}) {
  const layoutQuery = useCmsLayout(slot.layoutId || "");
  const layout = layoutQuery.data?.layout;

  const templatePayload = useMemo(() => {
    const schema = layout?.schema;
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      return null;
    }
    return buildPayloadTemplateFromSchema(schema as Record<string, unknown>);
  }, [layout?.schema]);

  const { rootKey, defs } = useMemo(() => {
    const schema = layout?.schema;
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      return { rootKey: "section", defs: [] };
    }
    return parseLayoutSchema(
      schema as Record<string, unknown>,
      layout?.rootKey
    );
  }, [layout?.schema, layout?.rootKey]);

  // Stable string key derived from the template — changes only when the
  // schema itself changes, not on every render.
  const templateKey = useMemo(
    () => (templatePayload ? JSON.stringify(sortedKeys(templatePayload)) : ""),
    [templatePayload]
  );

  // Track the templateKey we last ran a merge with so we don't re-patch when
  // nothing structurally changed (prevents the infinite loop with duplicate
  // layout IDs where mergeLayoutPayloadTemplate returns a new-reference but
  // structurally identical object and the old JSON.stringify differs only in
  // key insertion order).
  const lastMergedTemplateKeyRef = useRef<string>("");

  useEffect(() => {
    if (!slot.layoutId || !templatePayload) return;

    if (slot.appliedLayoutId !== slot.layoutId) {
      // Layout changed or was just set — seed with fresh template defaults.
      lastMergedTemplateKeyRef.current = templateKey;
      onSlotPatch(slot.id, {
        configValues: templatePayload,
        appliedLayoutId: slot.layoutId,
      });
      return;
    }

    // Layout already applied — merge in any new fields that were added to the
    // schema after the slot was last saved. Skip if the template hasn't changed
    // since the last merge (key-order-insensitive guard to prevent loops when
    // multiple slots share the same layoutId and produce new-reference-equal
    // merged objects).
    if (lastMergedTemplateKeyRef.current === templateKey) return;

    const merged = mergeLayoutPayloadTemplate(
      slot.configValues,
      templatePayload,
      defs
    );
    // deepEqual is key-order-insensitive — avoids false positives from
    // mergeLayoutPayloadTemplate returning objects with different key ordering.
    if (deepEqual(merged, slot.configValues)) {
      lastMergedTemplateKeyRef.current = templateKey;
      return;
    }

    lastMergedTemplateKeyRef.current = templateKey;
    onSlotPatch(slot.id, { configValues: merged });
    // Intentionally omit slot.configValues from deps: merge runs only when the
    // layout / schema identity changes (templateKey), not on every field edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- merge uses snapshot when templateKey / layout identity changes
  }, [
    slot.id,
    slot.layoutId,
    slot.appliedLayoutId,
    templateKey,
    templatePayload,
    onSlotPatch,
  ]);

  const layoutLoading = Boolean(slot.layoutId) && layoutQuery.isLoading;
  const layoutError = Boolean(slot.layoutId) && layoutQuery.isError;
  const layoutReady =
    Boolean(slot.layoutId) && layout && !layoutQuery.isLoading;

  // function resetToTemplate() {
  //   if (!templatePayload) return;
  //   onSlotPatch(slot.id, {
  //     configValues: templatePayload,
  //     appliedLayoutId: slot.layoutId,
  //   });
  // }

  if (!slot.layoutId) {
    if (hideLayoutSelect) return null;
    return (
      <p className="text-sm text-muted-foreground">
        Choose a layout to edit its fields.
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {layoutLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading layout…
        </div>
      )}
      {layoutError && (
        <p className="text-sm text-destructive">
          {hideLayoutSelect ? (
            <>
              Could not load this layout. Try again or use{" "}
              <span className="font-medium">Add layout</span> below to pick a
              section type.
            </>
          ) : (
            <>Could not load this layout. Pick another or try again.</>
          )}
        </p>
      )}
      {layoutReady && defs.length > 0 && (
        <>
          {/* <div className="flex min-w-0 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={resetToTemplate}
              disabled={disabled || !templatePayload}
            >
              Reset fields
            </Button>
          </div> */}
          <LayoutConfigForm
            rootKey={rootKey}
            defs={defs}
            value={slot.configValues}
            onChange={(next) =>
              onSlotPatch(slot.id, { configValues: next })
            }
            showRootKeyHint={!hideLayoutSelect}
          />
        </>
      )}
      {layoutReady && defs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This layout has no fields yet. Edit it in the layout builder.
        </p>
      )}
    </div>
  );
}

function SortableLayoutSlotCard({
  slot,
  layouts,
  layoutsLoading,
  disabled,
  canRemove,
  hideLayoutSelect,
  hideReorder,
  sectionIndex,
  defaultExpanded,
  expandAllSignal,
  collapseAllSignal,
  onSlotPatch,
  onRemove,
}: {
  slot: CmsNewPageLayoutSlot;
  layouts: CmsLayoutListItem[];
  layoutsLoading: boolean;
  disabled: boolean;
  canRemove: boolean;
  hideLayoutSelect: boolean;
  /** Hide drag handle (e.g. single navbar/footer layout). */
  hideReorder?: boolean;
  /** 1-based section number for the section header. */
  sectionIndex: number;
  defaultExpanded: boolean;
  /** Increment (e.g. parent button) to expand this section’s body. */
  expandAllSignal: number;
  /** Increment to collapse this section’s body. */
  collapseAllSignal: number;
  onSlotPatch: (id: string, patch: Partial<CmsNewPageLayoutSlot>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [prevExpandSignal, setPrevExpandSignal] = useState(expandAllSignal);
  const [prevCollapseSignal, setPrevCollapseSignal] = useState(collapseAllSignal);

  if (expandAllSignal !== prevExpandSignal) {
    setPrevExpandSignal(expandAllSignal);
    if (expandAllSignal > 0) {
      setExpanded(true);
    }
  }

  if (collapseAllSignal !== prevCollapseSignal) {
    setPrevCollapseSignal(collapseAllSignal);
    if (collapseAllSignal > 0) {
      setExpanded(false);
    }
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id, disabled: Boolean(hideReorder) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const selectValue = slot.layoutId ?? NO_LAYOUT;
  const resolvedLayoutName = slot.layoutId
    ? layouts.find((l) => l.id === slot.layoutId)?.name ??
      (layoutsLoading ? "Loading…" : "Unknown layout")
    : null;
  const sectionHeaderLabel = slot.layoutId
    ? resolvedLayoutName ?? "Unknown layout"
    : `Section ${sectionIndex}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        isDragging && "z-10 opacity-90 ring-2 ring-primary/30",
        slot.isActive === false &&
          "border-muted-foreground/35 bg-muted/25 opacity-95"
      )}
    >
      <div
        className={cn(
          "flex flex-wrap gap-3",
          expanded ? "items-start" : "items-center"
        )}
      >
        {hideReorder ? (
          <div
            className={cn("w-6 shrink-0", expanded ? "mt-0.5" : "mt-0 self-center")}
            aria-hidden
          />
        ) : (
          <button
            type="button"
            className={cn(
              "shrink-0 cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing",
              expanded ? "mt-0.5" : "mt-0 self-center"
            )}
            aria-label="Drag to reorder"
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}
        <div
          className={cn(
            "min-w-0 flex-1",
            expanded ? "space-y-4" : "flex items-center"
          )}
        >
          <div
            className={cn(
              "flex min-h-8 w-full flex-wrap justify-between gap-3",
              expanded ? "items-start" : "items-center"
            )}
          >
            <div
              className={cn(
                "flex min-w-0 flex-1 gap-1.5 sm:gap-2",
                expanded ? "items-start" : "items-center"
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={disabled}
                aria-expanded={expanded}
                aria-controls={`cms-slot-body-${slot.id}`}
                aria-label={
                  expanded
                    ? `Collapse ${sectionHeaderLabel}`
                    : `Expand ${sectionHeaderLabel}`
                }
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                )}
              </Button>
              <div
                className={cn(
                  "min-w-0 flex-1",
                  hideLayoutSelect ? (expanded ? "space-y-1" : "") : "space-y-2"
                )}
              >
                {hideLayoutSelect ? (
                  <p
                    className={cn(
                      "text-base font-semibold break-words",
                      expanded
                        ? "leading-snug"
                        : "flex h-8 items-center leading-none"
                    )}
                    title={slot.layoutId ? (resolvedLayoutName ?? undefined) : undefined}
                  >
                    {sectionHeaderLabel}
                  </p>
                ) : (
                  <div className="w-full min-w-0 max-w-md space-y-2">
                    <Label
                      htmlFor={`layout-${slot.id}`}
                      className="text-muted-foreground"
                    >
                      Layout
                    </Label>
                    <Select
                      value={selectValue}
                      onValueChange={(v) => {
                        if (v === NO_LAYOUT) {
                          onSlotPatch(slot.id, {
                            layoutId: null,
                            configValues: {},
                            appliedLayoutId: null,
                          });
                        } else {
                          onSlotPatch(slot.id, {
                            layoutId: v,
                            configValues: {},
                            appliedLayoutId: null,
                          });
                        }
                      }}
                      disabled={layoutsLoading || disabled}
                    >
                      <SelectTrigger id={`layout-${slot.id}`} className="w-full min-w-0">
                        <SelectValue placeholder="Choose layout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_LAYOUT}>No layout</SelectItem>
                        {layouts.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id={`cms-slot-active-${slot.id}`}
                  checked={slot.isActive !== false}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    onSlotPatch(slot.id, { isActive: checked })
                  }
                />
                <Label
                  htmlFor={`cms-slot-active-${slot.id}`}
                  className="cursor-pointer text-sm font-normal text-muted-foreground"
                >
                  Active
                </Label>
              </div>
              {canRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 text-destructive hover:text-destructive"
                  disabled={disabled}
                  onClick={() => onRemove(slot.id)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Remove section
                </Button>
              ) : null}
            </div>
          </div>
          <div
            id={`cms-slot-body-${slot.id}`}
            hidden={!expanded}
            className="min-w-0 border-t pt-4"
          >
            <LayoutSlotBody
              slot={slot}
              disabled={disabled}
              onSlotPatch={onSlotPatch}
              hideLayoutSelect={hideLayoutSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export interface CmsLayoutSlotsEditorProps {
  slots: CmsNewPageLayoutSlot[];
  onSlotPatch: (id: string, patch: Partial<CmsNewPageLayoutSlot>) => void;
  onReorderSlots: (activeId: string, overId: string) => void;
  onRemoveSlot: (id: string) => void;
  layouts: CmsLayoutListItem[];
  layoutsLoading: boolean;
  /**
   * When true, layout is read-only (no layout dropdown), section title is
   * "Section N" only; use Add layout to assign. Matches new + edit page.
   */
  hideLayoutSelect?: boolean;
  /** When true, no drag handle (single site-chrome layout). */
  hideReorder?: boolean;
  /** Initial expand state for each section (expand / shrink body). Default true. */
  defaultSectionExpanded?: boolean;
  /**
   * Increment from the parent (e.g. “Expand”) to open every section body.
   * Starts at 0; first effective increment is 1.
   */
  expandAllSignal?: number;
  /**
   * Increment from the parent (e.g. “Collapse”) to close every section body.
   * Starts at 0; first effective increment is 1.
   */
  collapseAllSignal?: number;
  /**
   * Minimum number of sections that must remain. Defaults to 1 to preserve
   * existing behavior in single-layout contexts.
   */
  minSlots?: number;
  disabled?: boolean;
}

export function CmsLayoutSlotsEditor({
  slots,
  onSlotPatch,
  onReorderSlots,
  onRemoveSlot,
  layouts,
  layoutsLoading,
  hideLayoutSelect = true,
  hideReorder = false,
  defaultSectionExpanded = true,
  expandAllSignal = 0,
  collapseAllSignal = 0,
  minSlots = 1,
  disabled = false,
}: CmsLayoutSlotsEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderSlots(String(active.id), String(over.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={slots.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-4">
          {slots.map((slot, index) => (
            <SortableLayoutSlotCard
              key={slot.id}
              slot={slot}
              layouts={layouts}
              layoutsLoading={layoutsLoading}
              disabled={disabled}
              canRemove={slots.length > Math.max(0, minSlots)}
              hideLayoutSelect={hideLayoutSelect}
              hideReorder={hideReorder}
              sectionIndex={index + 1}
              defaultExpanded={defaultSectionExpanded}
              expandAllSignal={expandAllSignal}
              collapseAllSignal={collapseAllSignal}
              onSlotPatch={onSlotPatch}
              onRemove={onRemoveSlot}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
