import { api } from "@/lib/fetcher";
import {
  publicCmsAnnouncementsApiPath,
  publicCmsDynamicRouteApiPath,
  publicCmsFooterApiPath,
  publicCmsNavigationApiPath,
} from "@/lib/cms/public-site-api-paths";
import type {
  CmsAnnouncementsConfig,
  CmsFooterConfig,
  CmsNavigationConfig,
} from "@/lib/cms/site-content-types";

// Block types
export const BLOCK_TYPES = [
  { type: "hero", label: "Hero Banner" },
  { type: "categories", label: "Categories Grid" },
  { type: "brands", label: "Brands Carousel" },
  { type: "featured_products", label: "Featured Products" },
  { type: "recommended", label: "Recommended Products" },
  { type: "editorial", label: "Editorial Section" },
  { type: "banner", label: "Promotional Banner" },
  { type: "text_block", label: "Text Block" },
] as const;

export type CmsBlockType = (typeof BLOCK_TYPES)[number]["type"];

export interface CmsLayoutRef {
  id: string;
  name: string;
  rootKey: string;
}

export interface CmsProjectRef {
  id: string;
  name: string;
  slug: string;
}

export interface CmsBlock {
  id: string;
  pageId: string;
  type: CmsBlockType;
  displayOrder: number;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Optional SEO / social metadata for storefront `<head>`; backend may omit until supported. */
export interface CmsPageSeoFields {
  metaTitle?: string | null;
  metaDescription?: string | null;
  /** Open Graph / Twitter card image URL */
  ogImage?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  canonicalUrl?: string | null;
  /** When true, suggest `noindex` to crawlers */
  noIndex?: boolean | null;
}

export interface CmsPage extends CmsPageSeoFields {
  id: string;
  projectId: string;
  slug: string;
  title: string;
  /** Enabled in CMS (not archived). */
  isActive: boolean;
  /** Live on public `/api/v1/pages/...`. */
  published: boolean;
  /** Admin-only draft; public API ignores until Publish. */
  draftData?: unknown | null;
  layoutId: string | null;
  blocks: CmsBlock[];
  createdAt: string;
  updatedAt: string;
  layout?: CmsLayoutRef | null;
}

export interface CmsPagesResponse {
  success: boolean;
  pages: CmsPage[];
}

export interface CmsPageResponse {
  success: boolean;
  page: CmsPage;
}

export interface CmsBlockResponse {
  success: boolean;
  block: CmsBlock;
}

export interface CmsReorderResponse {
  success: boolean;
  page: CmsPage;
}

export interface CmsLayout {
  id: string;
  projectId?: string;
  name: string;
  rootKey: string;
  schema: Record<string, unknown>;
  /** Optional screenshot / wireframe URL for editors (not part of `schema` JSON). */
  referenceImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmsLayoutListItem {
  id: string;
  name: string;
  rootKey: string;
  referenceImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmsLayoutsResponse {
  success: boolean;
  layouts: CmsLayoutListItem[];
}

export interface CmsLayoutResponse {
  success: boolean;
  layout: CmsLayout;
}

export type CmsCustomToolDefinition = {
  type?: string;
  key?: string;
  fields?: CmsCustomToolDefinition[];
  children?: CmsCustomToolDefinition[];
  defaultStr?: string;
  defaultLink?: { value?: string; href?: string; target?: string };
  collectionKey?: string;
  multiple?: boolean;
  required?: boolean;
};

export type CmsCollectionKey = string;

export interface CmsCollectionDefinition {
  id: string;
  key: string;
  name: string;
  schema: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CmsCollectionsResponse {
  success: boolean;
  collections: CmsCollectionDefinition[];
}

export interface CmsCollectionDefinitionResponse {
  success: boolean;
  collection: CmsCollectionDefinition;
}

export interface CmsCollectionItem {
  id: string;
  key: CmsCollectionKey;
  title: string;
  slug: string | null;
  payload: Record<string, unknown>;
  isActive: boolean;
  published: boolean;
  displayOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmsCollectionItemsResponse {
  success: boolean;
  items: CmsCollectionItem[];
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface CmsCollectionItemResponse {
  success: boolean;
  item: CmsCollectionItem;
}

/** Public GET /api/v1/collections/:key when `?slug=` only, or `?field.id=` only (detail). */
export interface CmsPublicCollectionDetailResponse {
  success: true;
  key: string;
  item: CmsCollectionItem;
}

/** Public GET /api/v1/collections/:key for listing / multi-filter search. */
export interface CmsPublicCollectionListResponse {
  success: true;
  key: string;
  data: CmsCollectionItem[];
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export type CmsPublicCollectionGetResponse =
  | CmsPublicCollectionDetailResponse
  | CmsPublicCollectionListResponse;

export interface CmsDynamicRouteMatchRule {
  param: string;
  fieldPath: string;
  kind?: "field" | "ref";
}

export interface CmsDynamicRoute {
  id: string;
  projectId: string;
  name: string;
  pattern: string;
  collectionKey: string;
  templateLayoutId: string | null;
  matchRules: CmsDynamicRouteMatchRule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CmsDynamicRoutesResponse {
  success: boolean;
  routes: CmsDynamicRoute[];
}

export interface CmsDynamicRouteResponse {
  success: boolean;
  route: CmsDynamicRoute;
}

export interface CmsCustomTool {
  id: string;
  name: string;
  description?: string | null;
  definition: CmsCustomToolDefinition;
  createdAt: string;
  updatedAt: string;
}

export type CmsCustomToolsMap = Record<string, CmsCustomTool>;

export interface CmsCustomToolsResponse {
  success: boolean;
  tools: CmsCustomToolsMap;
}

export interface CmsCustomToolResponse {
  success: boolean;
  tool: CmsCustomTool;
}

export interface CmsCustomToolsExportPayload {
  kind: "cms-custom-tools";
  version: 1;
  tools: Array<{
    name: string;
    description: string | null;
    definition: CmsCustomToolDefinition;
  }>;
}

export interface CmsCustomToolsImportResponse {
  success: boolean;
  created: CmsCustomTool[];
  rejected: Array<{
    index: number;
    name: string | null;
    reason: string;
  }>;
}

type CmsPageSeoCreatePatch = Partial<
  Pick<
    CmsPageSeoFields,
    | "metaTitle"
    | "metaDescription"
    | "ogImage"
    | "ogTitle"
    | "ogDescription"
    | "canonicalUrl"
    | "noIndex"
  >
>;

export type CmsPageCreateBody = {
  title: string;
  slug?: string;
  /** Storefront visibility. Legacy: `isActive` is accepted as an alias. */
  published?: boolean;
  /** @deprecated Use `published` for storefront visibility. */
  isActive?: boolean;
  layoutId?: string | null;
} & CmsPageSeoCreatePatch;

export type CmsPageUpdateBody = Partial<
  Pick<
    CmsPage,
    | "title"
    | "slug"
    | "isActive"
    | "published"
    | "draftData"
    | "layoutId"
    | "metaTitle"
    | "metaDescription"
    | "ogImage"
    | "ogTitle"
    | "ogDescription"
    | "canonicalUrl"
    | "noIndex"
  >
>;

export const cmsApi = {
  // Pages
  listPages: (projectSlug: string) =>
    api.get<CmsPagesResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/pages`
    ),

  getPage: (projectSlug: string, id: string) =>
    api.get<CmsPageResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/pages/${id}`
    ),

  createPage: (projectSlug: string, data: CmsPageCreateBody) =>
    api.post<CmsPageResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/pages`,
      data
    ),

  updatePage: (projectSlug: string, id: string, data: CmsPageUpdateBody) =>
    api.patch<CmsPageResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/pages/${id}`,
      data
    ),

  deletePage: (projectSlug: string, id: string) =>
    api.delete<{ success: boolean; message?: string }>(
      `/api/v1/admin/projects/${projectSlug}/cms/pages/${id}`
    ),

  // Blocks
  addBlock: (
    projectSlug: string,
    pageId: string,
    data: {
      type: CmsBlockType;
      config?: Record<string, unknown>;
      isActive?: boolean;
    }
  ) =>
    api.post<CmsBlockResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/pages/${pageId}/blocks`,
      data
    ),

  updateBlock: (
    projectSlug: string,
    blockId: string,
    data: {
      type?: CmsBlockType;
      config?: Record<string, unknown>;
      displayOrder?: number;
      isActive?: boolean;
    }
  ) =>
    api.patch<CmsBlockResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/blocks/${blockId}`,
      data
    ),

  deleteBlock: (projectSlug: string, blockId: string) =>
    api.delete<{ success: boolean; message?: string }>(
      `/api/v1/admin/projects/${projectSlug}/cms/blocks/${blockId}`
    ),

  reorderBlocks: (
    projectSlug: string,
    pageId: string,
    orderedBlockIds: string[]
  ) =>
    api.post<CmsReorderResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/pages/${pageId}/reorder`,
      { orderedBlockIds }
    ),

  // Layouts
  listLayouts: (projectSlug: string) =>
    api.get<CmsLayoutsResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/layouts`
    ),

  getLayout: (projectSlug: string, id: string) =>
    api.get<CmsLayoutResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/layouts/${id}`
    ),

  createLayout: (projectSlug: string, data: {
    name: string;
    rootKey: string;
    schema: Record<string, unknown>;
    referenceImageUrl?: string | null;
  }) =>
    api.post<CmsLayoutResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/layouts`,
      data
    ),

  updateLayout: (
    projectSlug: string,
    id: string,
    data: {
      name?: string;
      rootKey?: string;
      schema?: Record<string, unknown>;
      referenceImageUrl?: string | null;
    }
  ) =>
    api.patch<CmsLayoutResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/layouts/${id}`,
      data
    ),

  deleteLayout: (projectSlug: string, id: string) =>
    api.delete<{ success: boolean; message?: string }>(
      `/api/v1/admin/projects/${projectSlug}/cms/layouts/${id}`
    ),

  listCustomTools: (projectSlug: string) =>
    api.get<CmsCustomToolsResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/tools`
    ),

  getCustomTool: (projectSlug: string, id: string) =>
    api.get<CmsCustomToolResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/tools/${id}`
    ),

  createCustomTool: (
    projectSlug: string,
    data: {
      name: string;
      description?: string | null;
      definition: CmsCustomToolDefinition;
    }
  ) =>
    api.post<CmsCustomToolResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/tools`,
      data
    ),

  updateCustomTool: (
    projectSlug: string,
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      definition: CmsCustomToolDefinition;
    }>
  ) =>
    api.patch<CmsCustomToolResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/tools/${id}`,
      data
    ),

  deleteCustomTool: (projectSlug: string, id: string) =>
    api.delete<{ success: boolean; message?: string }>(
      `/api/v1/admin/projects/${projectSlug}/cms/tools/${id}`
    ),

  exportCustomTools: (projectSlug: string, ids?: string[]) => {
    const search =
      ids && ids.length > 0
        ? `?${new URLSearchParams({ ids: ids.join(",") }).toString()}`
        : "";
    return api.get<CmsCustomToolsExportPayload>(
      `/api/v1/admin/projects/${projectSlug}/cms/tools/export${search}`
    );
  },

  exportCustomTool: (projectSlug: string, id: string) =>
    api.get<CmsCustomToolsExportPayload>(
      `/api/v1/admin/projects/${projectSlug}/cms/tools/${id}/export`
    ),

  importCustomTools: (
    projectSlug: string,
    data:
      | CmsCustomToolsExportPayload
      | Array<{
          name: string;
          description?: string | null;
          definition: CmsCustomToolDefinition;
        }>
      | Record<string, unknown>
  ) =>
    api.post<CmsCustomToolsImportResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/tools/import`,
      data
    ),

  listCollections: (
    projectSlug: string,
    params?: {
      q?: string;
    }
  ) =>
    api.get<CmsCollectionsResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/collections`,
      { params }
    ),

  upsertCollection: (
    projectSlug: string,
    key: string,
    data: { name: string; schema?: Record<string, unknown> }
  ) =>
    api.put<CmsCollectionDefinitionResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/collections/${encodeURIComponent(key)}`,
      data
    ),

  deleteCollection: (projectSlug: string, key: string) =>
    api.delete<{ success: boolean; message?: string }>(
      `/api/v1/admin/projects/${projectSlug}/cms/collections/${encodeURIComponent(key)}`
    ),

  listCollectionItems: (
    projectSlug: string,
    key: CmsCollectionKey,
    params?: {
      includeInactive?: boolean;
      includeDraft?: boolean;
      limit?: number;
      offset?: number;
      sort?: "displayOrderAsc" | "updatedAtDesc" | "createdAtDesc";
    }
  ) =>
    api.get<CmsCollectionItemsResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/collections/${key}`,
      { params }
    ),

  getCollectionItem: (projectSlug: string, key: CmsCollectionKey, id: string) =>
    api.get<CmsCollectionItemResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/collections/${key}/${id}`
    ),

  createCollectionItem: (
    projectSlug: string,
    key: CmsCollectionKey,
    data: {
      title: string;
      slug?: string | null;
      payload?: Record<string, unknown>;
      isActive?: boolean;
      published?: boolean;
      displayOrder?: number;
    }
  ) =>
    api.post<CmsCollectionItemResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/collections/${key}`,
      data
    ),

  updateCollectionItem: (
    projectSlug: string,
    key: CmsCollectionKey,
    id: string,
    data: Partial<{
      title: string;
      slug: string | null;
      payload: Record<string, unknown>;
      isActive: boolean;
      published: boolean;
      displayOrder: number;
    }>
  ) =>
    api.patch<CmsCollectionItemResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/collections/${key}/${id}`,
      data
    ),

  deleteCollectionItem: (projectSlug: string, key: CmsCollectionKey, id: string) =>
    api.delete<{ success: boolean; message?: string }>(
      `/api/v1/admin/projects/${projectSlug}/cms/collections/${key}/${id}`
    ),

  /** Site chrome — nested trees (backend may 404 until implemented; dashboard uses session fallback). */
  getNavigationConfig: (projectSlug: string) =>
    api.get<{ success: boolean; navigation: CmsNavigationConfig }>(
      `/api/v1/admin/projects/${projectSlug}/cms/navigation`
    ),

  putNavigationConfig: (projectSlug: string, data: CmsNavigationConfig) =>
    api.put<{ success: boolean; navigation: CmsNavigationConfig }>(
      `/api/v1/admin/projects/${projectSlug}/cms/navigation`,
      data
    ),

  getFooterConfig: (projectSlug: string) =>
    api.get<{ success: boolean; footer: CmsFooterConfig }>(
      `/api/v1/admin/projects/${projectSlug}/cms/footer`
    ),

  putFooterConfig: (projectSlug: string, data: CmsFooterConfig) =>
    api.put<{ success: boolean; footer: CmsFooterConfig }>(
      `/api/v1/admin/projects/${projectSlug}/cms/footer`,
      data
    ),

  getAnnouncementsConfig: (projectSlug: string) =>
    api.get<{ success: boolean; announcements: CmsAnnouncementsConfig }>(
      `/api/v1/admin/projects/${projectSlug}/cms/announcements`
    ),

  putAnnouncementsConfig: (projectSlug: string, data: CmsAnnouncementsConfig) =>
    api.put<{ success: boolean; announcements: CmsAnnouncementsConfig }>(
      `/api/v1/admin/projects/${projectSlug}/cms/announcements`,
      data
    ),

  /**
   * Public storefront site chrome — flat JSON: **`success`** + layout root keys from the first
   * active section’s **`configValues`** (e.g. `announcement_under_construction`), not nested `announcements.sections`.
   */
  getPublicNavigation: (projectSlug: string) =>
    api.get<{ success: boolean } & Record<string, unknown>>(
      publicCmsNavigationApiPath(),
      { headers: { "x-tenant-slug": projectSlug } }
    ),

  getPublicFooter: (projectSlug: string) =>
    api.get<{ success: boolean } & Record<string, unknown>>(
      publicCmsFooterApiPath(),
      { headers: { "x-tenant-slug": projectSlug } }
    ),

  getPublicAnnouncements: (projectSlug: string) =>
    api.get<{ success: boolean } & Record<string, unknown>>(
      publicCmsAnnouncementsApiPath(),
      { headers: { "x-tenant-slug": projectSlug } }
    ),

  getPublicCollectionItems: (
    projectSlug: string,
    key: CmsCollectionKey,
    params?: {
      limit?: number;
      offset?: number;
      sort?: "displayOrderAsc" | "updatedAtDesc" | "createdAtDesc";
      tag?: string;
      locale?: string;
      slug?: string;
      fieldFilters?: Record<string, string>;
      refFilters?: Record<string, string>;
    }
  ) =>
    api.get<CmsPublicCollectionGetResponse>(
      `/api/v1/collections/${key}`,
      {
        headers: { "x-tenant-slug": projectSlug },
        params: params
          ? (() => {
              const { fieldFilters, refFilters, ...rest } = params;
              return {
                ...rest,
                ...(fieldFilters
                  ? Object.fromEntries(
                      Object.entries(fieldFilters).map(([k, v]) => [
                        `field.${k}`,
                        v,
                      ]),
                    )
                  : {}),
                ...(refFilters
                  ? Object.fromEntries(
                      Object.entries(refFilters).map(([k, v]) => [
                        `ref.${k}`,
                        v,
                      ]),
                    )
                  : {}),
              };
            })()
          : undefined,
      }
    ),

  listDynamicRoutes: (projectSlug: string) =>
    api.get<CmsDynamicRoutesResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/dynamic-routes`,
    ),

  getDynamicRoute: (projectSlug: string, id: string) =>
    api.get<CmsDynamicRouteResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/dynamic-routes/${id}`,
    ),

  createDynamicRoute: (
    projectSlug: string,
    data: {
      name: string;
      pattern: string;
      collectionKey: string;
      templateLayoutId?: string | null;
      matchRules: CmsDynamicRouteMatchRule[];
      isActive?: boolean;
    },
  ) =>
    api.post<CmsDynamicRouteResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/dynamic-routes`,
      data,
    ),

  updateDynamicRoute: (
    projectSlug: string,
    id: string,
    data: Partial<{
      name: string;
      pattern: string;
      collectionKey: string;
      templateLayoutId: string | null;
      matchRules: CmsDynamicRouteMatchRule[];
      isActive: boolean;
    }>,
  ) =>
    api.patch<CmsDynamicRouteResponse>(
      `/api/v1/admin/projects/${projectSlug}/cms/dynamic-routes/${id}`,
      data,
    ),

  deleteDynamicRoute: (projectSlug: string, id: string) =>
    api.delete<{ success: boolean; message?: string }>(
      `/api/v1/admin/projects/${projectSlug}/cms/dynamic-routes/${id}`,
    ),

  testDynamicRoute: (projectSlug: string, path: string) =>
    api.get<{
      success: boolean;
      route: CmsDynamicRoute;
      params: Record<string, string>;
      item: Record<string, unknown>;
      layout: Record<string, unknown> | null;
    }>(
      `/api/v1/admin/projects/${projectSlug}/cms/dynamic-routes-resolve`,
      { params: { path } },
    ),

  resolvePublicDynamicRoute: (
    projectSlug: string,
    path: string,
    params?: { flatten?: boolean },
  ) => {
    const base = publicCmsDynamicRouteApiPath(path);
    const qs = params?.flatten === false ? "?flatten=false" : "";
    return api.get<{
      success: boolean;
      route: CmsDynamicRoute;
      params: Record<string, string>;
      item: Record<string, unknown>;
      layout: Record<string, unknown> | null;
    }>(`${base}${qs}`, {
      headers: { "x-tenant-slug": projectSlug },
    });
  },
};
