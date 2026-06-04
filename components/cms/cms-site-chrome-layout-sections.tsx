"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import {
  CMS_LAYOUT_PAGE_PREVIEW_ASIDE_CLASSNAME,
  CmsLayoutPagePreviewAside,
} from "@/components/cms/cms-layout-page-preview-aside";
import { CmsLayoutSlotsEditor } from "@/components/cms/cms-layout-slots-editor";
import { useCmsLayouts } from "@/hooks/use-cms";
import {
  slotsWithAddedLayout,
  type CmsNewPageLayoutSlot,
} from "@/lib/cms/new-page-draft";
import { toast } from "sonner";

export function CmsSiteChromeLayoutSections({
  returnPath,
  sections,
  onSectionsChange,
  disabled,
  previewTitle = "Layout preview",
  previewDescription = "Section reference images from each layout stack in order. Values are stored in this site config.",
  previewMode = "default",
  /** Navbar / footer: only one layout section; choosing another replaces it. */
  maxSections,
}: {
  returnPath: string;
  sections: CmsNewPageLayoutSlot[];
  onSectionsChange: (next: CmsNewPageLayoutSlot[]) => void;
  disabled?: boolean;
  previewTitle?: string;
  previewDescription?: string;
  /** `imageOnly` shows stacked reference images with no chrome (navbar / announcements). */
  previewMode?: "default" | "imageOnly";
  maxSections?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consumedAddLayoutSearchRef = useRef<string | null>(null);
  const sectionsRef = useRef(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  });

  const { data: layoutsRes, isLoading: layoutsLoading } = useCmsLayouts();
  const layouts = layoutsRes?.layouts ?? [];

  const cap = maxSections ?? Infinity;
  const singleChrome = cap <= 1;

  const emitSections = useCallback(
    (next: CmsNewPageLayoutSlot[]) => {
      if (Number.isFinite(cap) && next.length > cap) {
        onSectionsChange(next.slice(0, cap));
        return;
      }
      onSectionsChange(next);
    },
    [cap, onSectionsChange],
  );

  const returnToLayoutsHref = `/dashboard/cms/layouts?returnTo=${encodeURIComponent(returnPath)}`;

  useEffect(() => {
    const addLayoutId = searchParams.get("addLayoutId");
    if (!addLayoutId) {
      consumedAddLayoutSearchRef.current = null;
      return;
    }
    const searchKey = searchParams.toString();
    if (consumedAddLayoutSearchRef.current === searchKey) return;
    consumedAddLayoutSearchRef.current = searchKey;

    emitSections(
      slotsWithAddedLayout(sectionsRef.current, addLayoutId, maxSections),
    );
    router.replace(returnPath, { scroll: false });
    toast.success(
      singleChrome && sectionsRef.current.some((s) => s.layoutId)
        ? "Layout updated — fill in the fields below."
        : "Layout added — fill in the fields below.",
    );
  }, [
    searchParams,
    router,
    returnPath,
    emitSections,
    maxSections,
    singleChrome,
  ]);

  const patchSlot = useCallback(
    (id: string, patch: Partial<CmsNewPageLayoutSlot>) => {
      emitSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [sections, emitSections],
  );

  const reorderSlots = useCallback(
    (activeId: string, overId: string) => {
      if (singleChrome) return;
      const oldIndex = sections.findIndex((s) => s.id === activeId);
      const newIndex = sections.findIndex((s) => s.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;
      emitSections(arrayMove(sections, oldIndex, newIndex));
    },
    [sections, emitSections, singleChrome],
  );

  const removeSlot = useCallback(
    (id: string) => {
      emitSections(sections.filter((s) => s.id !== id));
    },
    [sections, emitSections],
  );

  const addLayoutLabel =
    singleChrome && sections.some((s) => s.layoutId)
      ? "Change layout"
      : "Add layout";

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Layout sections</h2>
          <p className="text-xs text-muted-foreground">
            {singleChrome ? (
              <>
                One layout only for this area. Use{" "}
                <span className="font-medium">{addLayoutLabel}</span> to pick or
                replace the layout; field values are stored in this config as{" "}
                <span className="font-mono">sections</span>.
              </>
            ) : (
              <>
                Same flow as CMS pages: add sections with{" "}
                <span className="font-medium">Add layout</span>, reorder with
                the handle, and fill schema fields. Stored in this area&apos;s
                JSON payload as <span className="font-mono">sections</span>.
              </>
            )}
          </p>
          {sections.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No layout yet. Use{" "}
              <span className="font-medium text-foreground">Add layout</span>{" "}
              below to pick a layout.
            </p>
          ) : null}
          <CmsLayoutSlotsEditor
            slots={sections}
            onSlotPatch={patchSlot}
            onReorderSlots={reorderSlots}
            onRemoveSlot={removeSlot}
            layouts={layouts}
            layoutsLoading={layoutsLoading}
            disabled={disabled}
            hideReorder={singleChrome}
          />
        </div>

        <div className="flex flex-row gap-2">
          <div className="mx-auto flex w-full max-w-4xl justify-center px-4">
            <Button variant="secondary" size="lg" asChild>
              <Link href={returnToLayoutsHref}>{addLayoutLabel}</Link>
            </Button>
          </div>
        </div>
      </div>

      <aside className={`${CMS_LAYOUT_PAGE_PREVIEW_ASIDE_CLASSNAME} w-[40%]!`}>
        <CmsLayoutPagePreviewAside
          slots={sections}
          layouts={layouts}
          title={previewTitle}
          description={previewDescription}
          mode={previewMode}
        />
      </aside>
    </div>
  );
}
