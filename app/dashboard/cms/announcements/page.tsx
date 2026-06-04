"use client";

import {
  Suspense,
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { useQueryClient } from "@/lib/shared/react-query";
import { Loader2, Megaphone } from "lucide-react";
import { CmsPublicApiLink } from "@/components/cms/cms-public-api-link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CmsAnnouncementTreeEditor } from "@/components/cms/cms-announcement-tree-editor";
import { CmsSiteChromeLayoutSections } from "@/components/cms/cms-site-chrome-layout-sections";
import {
  CmsReferenceScreenshotField,
  CmsReferenceScreenshotPreview,
} from "@/components/cms/cms-reference-screenshot-field";
import {
  useCmsAnnouncementsConfig,
  useUpdateCmsAnnouncementsConfig,
} from "@/hooks/use-cms-site-content";
import { useSaveShortcut } from "@/hooks/use-save-shortcut";
import { cmsApi, type CmsLayoutResponse } from "@/lib/cms/api";
import { validateSiteLayoutSectionsOptional } from "@/lib/cms/page-slots";
import type { CmsAnnouncementsConfig } from "@/lib/cms/site-content-types";
import type { CmsNewPageLayoutSlot } from "@/lib/cms/new-page-draft";
import { publicCmsAnnouncementsApiPath } from "@/lib/cms/public-site-api-paths";
import { toast } from "sonner";

const ANNOUNCEMENTS_PATH = "/dashboard/cms/announcements";

function AnnouncementsLayoutSectionsTab({
  draft,
  setDraft,
  disabled,
}: {
  draft: CmsAnnouncementsConfig;
  setDraft: Dispatch<SetStateAction<CmsAnnouncementsConfig | null>>;
  disabled: boolean;
}) {
  const sections = draft.sections ?? [];
  const onSectionsChange = useCallback(
    (next: CmsNewPageLayoutSlot[]) => {
      setDraft((d) =>
        d
          ? {
              ...d,
              sections: next.length > 0 ? next : undefined,
            }
          : d,
      );
    },
    [setDraft],
  );

  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
          style={{ minHeight: 200 }}
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading layout editor…
        </div>
      }
    >
      <CmsSiteChromeLayoutSections
        returnPath={ANNOUNCEMENTS_PATH}
        sections={sections}
        onSectionsChange={onSectionsChange}
        disabled={disabled}
        previewTitle="Announcements layout preview"
        previewMode="imageOnly"
        maxSections={1}
      />
    </Suspense>
  );
}

export default function CmsAnnouncementsPage() {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCmsAnnouncementsConfig();
  const update = useUpdateCmsAnnouncementsConfig();
  const [draft, setDraft] = useState<CmsAnnouncementsConfig | null>(null);
  const [prevData, setPrevData] = useState<CmsAnnouncementsConfig | undefined>(undefined);

  if (data !== prevData) {
    setPrevData(data);
    setDraft(data ?? null);
  }

  async function handleSave() {
    if (!draft) return;
    const err = await validateSiteLayoutSectionsOptional(
      draft.sections ?? [],
      async (layoutId) => {
        const cached = queryClient.getQueryData<CmsLayoutResponse>([
          "cms-layouts",
          layoutId,
        ]);
        if (cached?.layout) return cached.layout;
        const res = await cmsApi.getLayout(currentProject!.slug, layoutId);
        return res.layout ?? null;
      },
    );
    if (err) {
      toast.error(err);
      return;
    }
    update.mutate(draft);
  }

  useSaveShortcut(
    () => {
      if (update.isPending || !draft) return;
      void handleSave();
    },
    { enabled: true },
  );

  if (isLoading || !draft) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading announcements…
      </div>
    );
  }

  const refUrl = draft.referenceImageUrl?.trim() ?? "";

  return (
    <div className="flex w-full max-w-none flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/dashboard/cms">← CMS home</Link>
      </Button>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Use <strong>Structured tree</strong> for stacked banners, or{" "}
          <strong>Layout sections</strong> for a single layout-based strip. Add
          a reference screenshot to preview the announcement bar in the panel.
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">Public API</span>
          <CmsPublicApiLink
            apiPath={publicCmsAnnouncementsApiPath()}
            tenantSlug={currentProject?.slug}
            tenantDomain={currentProject?.primaryDomain}
            titleHint="Public JSON: success + layout root keys from configValues (e.g. announcement_under_construction)."
          />
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <Checkbox
            id="cms-announcements-enabled"
            checked={draft.enabled !== false}
            disabled={update.isPending}
            onCheckedChange={(v) =>
              setDraft({
                ...draft,
                enabled: v === true,
              })
            }
          />
          <div className="grid gap-1 leading-none">
            <Label
              htmlFor="cms-announcements-enabled"
              className="cursor-pointer text-sm font-medium leading-none"
            >
              Show announcement bar
            </Label>
            <p className="text-xs text-muted-foreground">
              When unchecked, the storefront should hide the bar entirely (saved
              with your announcements config).
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="layouts" className="w-full gap-6">
        <TabsList className="w-full max-w-md justify-start">
          <TabsTrigger value="layouts">Layout sections</TabsTrigger>
          <TabsTrigger value="tree">Structured tree</TabsTrigger>
        </TabsList>

        <TabsContent value="layouts" className="mt-0">
          <AnnouncementsLayoutSectionsTab
            draft={draft}
            setDraft={setDraft}
            disabled={update.isPending}
          />
        </TabsContent>

        <TabsContent value="tree" className="mt-0">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-start">
            <div className="min-w-0 max-w-3xl space-y-6">
              <CmsReferenceScreenshotField
                inputId="cms-announcements-reference-image"
                value={refUrl}
                onChange={(url) =>
                  setDraft({
                    ...draft,
                    referenceImageUrl: url.trim() ? url.trim() : null,
                  })
                }
                description={
                  <>
                    Wireframe or mockup of the announcement bar. Stored in this
                    config; upload uses the media folder{" "}
                    <span className="font-mono">cms</span>.
                  </>
                }
              />

              <CmsAnnouncementTreeEditor
                items={draft.items}
                onChange={(items) => setDraft({ ...draft, items })}
              />
            </div>

            <CmsReferenceScreenshotPreview
              url={refUrl}
              title="Announcements preview"
              emptyHint="Add a reference screenshot to preview the announcement bar here."
              imageOnly
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={update.isPending}
          onClick={() => void handleSave()}
        >
          {update.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Save announcements
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => data && setDraft(data)}
          disabled={update.isPending}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
