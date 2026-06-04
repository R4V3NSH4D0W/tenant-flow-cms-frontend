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
import { Loader2, Menu } from "lucide-react";
import { CmsPublicApiLink } from "@/components/cms/cms-public-api-link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CmsLinkTreeEditor } from "@/components/cms/cms-link-tree-editor";
import { CmsSiteChromeLayoutSections } from "@/components/cms/cms-site-chrome-layout-sections";
import {
  CmsReferenceScreenshotField,
  CmsReferenceScreenshotPreview,
} from "@/components/cms/cms-reference-screenshot-field";
import {
  useCmsNavigationConfig,
  useUpdateCmsNavigationConfig,
} from "@/hooks/use-cms-site-content";
import { useSaveShortcut } from "@/hooks/use-save-shortcut";
import { cmsApi, type CmsLayoutResponse } from "@/lib/cms/api";
import { validateSiteLayoutSectionsOptional } from "@/lib/cms/page-slots";
import type { CmsNavigationConfig } from "@/lib/cms/site-content-types";
import type { CmsNewPageLayoutSlot } from "@/lib/cms/new-page-draft";
import { publicCmsNavigationApiPath } from "@/lib/cms/public-site-api-paths";
import { toast } from "sonner";

const NAV_PATH = "/dashboard/cms/navigation";

function NavigationLayoutSectionsTab({
  draft,
  setDraft,
  disabled,
}: {
  draft: CmsNavigationConfig;
  setDraft: Dispatch<SetStateAction<CmsNavigationConfig | null>>;
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
        returnPath={NAV_PATH}
        sections={sections}
        onSectionsChange={onSectionsChange}
        disabled={disabled}
        previewMode="imageOnly"
        maxSections={1}
      />
    </Suspense>
  );
}

export default function CmsNavigationPage() {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCmsNavigationConfig();
  const update = useUpdateCmsNavigationConfig();
  const [draft, setDraft] = useState<CmsNavigationConfig | null>(null);
  const [prevData, setPrevData] = useState<CmsNavigationConfig | undefined>(undefined);

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
        Loading navigation…
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
          <Menu className="h-6 w-6 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight">Navigation</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Use <strong>Structured links</strong> for nested menus, or{" "}
          <strong>Layout sections</strong> to design the navbar with the same
          layout flow as CMS pages. Add a reference screenshot to preview the
          target navbar in the panel.
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">Public API</span>
          <CmsPublicApiLink
            apiPath={publicCmsNavigationApiPath()}
            tenantSlug={currentProject?.slug}
            tenantDomain={currentProject?.primaryDomain}
            titleHint="Public JSON: success + layout configValues keys (flat), not nested sections."
          />
        </div>
      </div>

      <Tabs defaultValue="layouts" className="w-full gap-6">
        <TabsList className="w-full max-w-md justify-start">
          <TabsTrigger value="layouts">Layout sections</TabsTrigger>
          <TabsTrigger value="links">Structured links</TabsTrigger>
        </TabsList>

        <TabsContent value="layouts" className="mt-0">
          <NavigationLayoutSectionsTab
            draft={draft}
            setDraft={setDraft}
            disabled={update.isPending}
          />
        </TabsContent>

        <TabsContent value="links" className="mt-0">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-start">
            <div className="min-w-0 space-y-6">
              <CmsReferenceScreenshotField
                inputId="cms-nav-reference-image"
                value={refUrl}
                onChange={(url) =>
                  setDraft({
                    ...draft,
                    referenceImageUrl: url.trim() ? url.trim() : null,
                  })
                }
                description={
                  <>
                    Wireframe or mockup of the header / navbar. Stored in this
                    config; upload uses the media folder{" "}
                    <span className="font-mono">cms</span>.
                  </>
                }
              />

              <CmsLinkTreeEditor
                items={draft.items}
                onChange={(items) => setDraft({ ...draft, items })}
              />
            </div>

            <CmsReferenceScreenshotPreview
              url={refUrl}
              title="Navbar preview"
              emptyHint="Add a reference screenshot to preview the navbar design here."
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
          Save navigation
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
