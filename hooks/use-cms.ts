import { useMutation, useQuery, useQueryClient } from "@/lib/shared/react-query";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import {
  cmsApi,
  type CmsBlockType,
  type CmsCollectionKey,
  type CmsCustomToolDefinition,
  type CmsCustomToolsExportPayload,
  type CmsDynamicRouteMatchRule,
  type CmsPageCreateBody,
  type CmsPageUpdateBody,
} from "@/lib/cms/api";
import { toast } from "sonner";

export type CmsBlockUpdateInput = {
  type?: CmsBlockType;
  config?: Record<string, unknown>;
  displayOrder?: number;
  isActive?: boolean;
};

// Page hooks
export const useCmsPages = () => {
  const { currentProject } = useCurrentProject();
  return useQuery({
    queryKey: ["cms-pages", currentProject?.slug],
    queryFn: () => cmsApi.listPages(currentProject!.slug),
    enabled: !!currentProject,
  });
};

export const useCmsPage = (id: string) => {
  const { currentProject } = useCurrentProject();
  return useQuery({
    queryKey: ["cms-pages", currentProject?.slug, id],
    queryFn: () => cmsApi.getPage(currentProject!.slug, id),
    enabled: !!id && !!currentProject,
  });
};

export const useCreateCmsPage = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CmsPageCreateBody) =>
      cmsApi.createPage(currentProject!.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      toast.success("Page created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create page");
    },
  });
};

export const useUpdateCmsPage = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CmsPageUpdateBody }) =>
      cmsApi.updatePage(currentProject!.slug, id, data),
    onSuccess: (_res, { id }) => {
      // Prefix-invalidate all cms-pages queries (list + individual).
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      toast.success("Page updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update page");
    },
  });
};

export const useDeleteCmsPage = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cmsApi.deletePage(currentProject!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      toast.success("Page deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete page");
    },
  });
};

// Block hooks
export const useAddBlock = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pageId,
      data,
    }: {
      pageId: string;
      data: {
        type: CmsBlockType;
        config?: Record<string, unknown>;
        isActive?: boolean;
      };
    }) => cmsApi.addBlock(currentProject!.slug, pageId, data),
    onSuccess: (_res, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      queryClient.invalidateQueries({ queryKey: ["cms-pages", pageId] });
      toast.success("Block added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add block");
    },
  });
};

export const useUpdateBlock = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pageId,
      blockId,
      data,
    }: {
      pageId: string;
      blockId: string;
      data: CmsBlockUpdateInput;
    }) => cmsApi.updateBlock(currentProject!.slug, blockId, data),
    onSuccess: (_res, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      queryClient.invalidateQueries({ queryKey: ["cms-pages", pageId] });
      toast.success("Block updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update block");
    },
  });
};

export const useDeleteBlock = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, blockId }: { pageId: string; blockId: string }) =>
      cmsApi.deleteBlock(currentProject!.slug, blockId),
    onSuccess: (_res, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      queryClient.invalidateQueries({ queryKey: ["cms-pages", pageId] });
      toast.success("Block deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete block");
    },
  });
};

export const useReorderBlocks = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pageId,
      orderedBlockIds,
    }: {
      pageId: string;
      orderedBlockIds: string[];
    }) =>
      cmsApi.reorderBlocks(currentProject!.slug, pageId, orderedBlockIds),
    onSuccess: (_res, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      queryClient.invalidateQueries({ queryKey: ["cms-pages", pageId] });
      toast.success("Blocks reordered successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reorder blocks");
    },
  });
};

// Layout hooks
export const useCmsLayouts = () => {
  const { currentProject } = useCurrentProject();
  return useQuery({
    queryKey: ["cms-layouts", currentProject?.slug],
    queryFn: () => cmsApi.listLayouts(currentProject!.slug),
    enabled: !!currentProject,
  });
};

export const useCmsLayout = (id: string) => {
  const { currentProject } = useCurrentProject();
  return useQuery({
    queryKey: ["cms-layouts", currentProject?.slug, id],
    queryFn: () => cmsApi.getLayout(currentProject!.slug, id),
    enabled: !!id && !!currentProject,
  });
};

export const useCreateCmsLayout = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      rootKey: string;
      schema: Record<string, unknown>;
      referenceImageUrl?: string | null;
    }) => cmsApi.createLayout(currentProject!.slug, data),
    onSuccess: () => {
      // Prefix-invalidate all cms-layouts queries (list + individual).
      queryClient.invalidateQueries({ queryKey: ["cms-layouts"] });
      toast.success("Layout created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create layout");
    },
  });
};

export const useUpdateCmsLayout = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        rootKey?: string;
        schema?: Record<string, unknown>;
        referenceImageUrl?: string | null;
      };
    }) => cmsApi.updateLayout(currentProject!.slug, id, data),
    onSuccess: () => {
      // Prefix-invalidate all cms-layouts queries (list + individual).
      queryClient.invalidateQueries({ queryKey: ["cms-layouts"] });
      toast.success("Layout updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update layout");
    },
  });
};

export const useDeleteCmsLayout = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      cmsApi.deleteLayout(currentProject!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-layouts"] });
      queryClient.invalidateQueries({ queryKey: ["cms-pages"] });
      toast.success("Layout deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete layout");
    },
  });
};

// Custom layout tool hooks
export const useCmsCustomTools = () => {
  const { currentProject } = useCurrentProject();
  return useQuery({
    queryKey: ["cms-tools", currentProject?.slug],
    queryFn: () => cmsApi.listCustomTools(currentProject!.slug),
    enabled: !!currentProject,
  });
};

export const useCmsCustomTool = (id: string) => {
  const { currentProject } = useCurrentProject();
  return useQuery({
    queryKey: ["cms-tools", currentProject?.slug, id],
    queryFn: () => cmsApi.getCustomTool(currentProject!.slug, id),
    enabled: !!currentProject && !!id,
  });
};

export const useCreateCmsCustomTool = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string | null;
      definition: CmsCustomToolDefinition;
    }) => cmsApi.createCustomTool(currentProject!.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-tools"] });
      toast.success("Tool created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create tool");
    },
  });
};

export const useUpdateCmsCustomTool = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        name: string;
        description: string | null;
        definition: CmsCustomToolDefinition;
      }>;
    }) => cmsApi.updateCustomTool(currentProject!.slug, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-tools"] });
      toast.success("Tool updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update tool");
    },
  });
};

export const useDeleteCmsCustomTool = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cmsApi.deleteCustomTool(currentProject!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-tools"] });
      toast.success("Tool deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete tool");
    },
  });
};

export const useExportCmsCustomTools = () => {
  const { currentProject } = useCurrentProject();
  return useMutation({
    mutationFn: (ids?: string[]) =>
      cmsApi.exportCustomTools(currentProject!.slug, ids),
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export tools");
    },
  });
};

export const useExportCmsCustomTool = () => {
  const { currentProject } = useCurrentProject();
  return useMutation({
    mutationFn: (id: string) => cmsApi.exportCustomTool(currentProject!.slug, id),
    onError: (error: Error) => {
      toast.error(error.message || "Failed to export tool");
    },
  });
};

export const useImportCmsCustomTools = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CmsCustomToolsExportPayload | Record<string, unknown>) =>
      cmsApi.importCustomTools(currentProject!.slug, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["cms-tools"] });
      if (result.created.length > 0) {
        toast.success(
          `Imported ${result.created.length} tool${
            result.created.length === 1 ? "" : "s"
          }`,
        );
      }
      if (result.rejected.length > 0) {
        toast.error(
          `${result.rejected.length} item${
            result.rejected.length === 1 ? " was" : "s were"
          } skipped during import`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import tools");
    },
  });
};

export const useCmsCollectionItems = (
  key: CmsCollectionKey,
  options?: {
    includeInactive?: boolean;
    includeDraft?: boolean;
    limit?: number;
    offset?: number;
    sort?: "displayOrderAsc" | "updatedAtDesc" | "createdAtDesc";
    enabled?: boolean;
  },
) => {
  const { currentProject } = useCurrentProject();
  const enabled = options?.enabled ?? true;
  const queryOptions = options
    ? {
        includeInactive: options.includeInactive,
        includeDraft: options.includeDraft,
        limit: options.limit,
        offset: options.offset,
        sort: options.sort,
      }
    : undefined;
  return useQuery({
    queryKey: ["cms-collections", currentProject?.slug, key, queryOptions],
    queryFn: () => cmsApi.listCollectionItems(currentProject!.slug, key, queryOptions),
    enabled: !!currentProject && !!key && enabled,
  });
};

export const useCmsCollections = (options?: { q?: string; enabled?: boolean }) => {
  const { currentProject } = useCurrentProject();
  const q = options?.q?.trim() ?? "";
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["cms-collection-defs", currentProject?.slug, q],
    queryFn: () => cmsApi.listCollections(currentProject!.slug, q ? { q } : undefined),
    enabled: !!currentProject && enabled,
  });
};

export const useUpsertCmsCollection = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      data,
    }: {
      key: string;
      data: { name: string; schema?: Record<string, unknown> };
    }) => cmsApi.upsertCollection(currentProject!.slug, key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-collection-defs"] });
      toast.success("Collection saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save collection");
    },
  });
};

export const useDeleteCmsCollection = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => cmsApi.deleteCollection(currentProject!.slug, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-collection-defs"] });
      queryClient.invalidateQueries({ queryKey: ["cms-collections"] });
      toast.success("Collection deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete collection");
    },
  });
};

export const useCreateCmsCollectionItem = (key: CmsCollectionKey) => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      slug?: string | null;
      payload?: Record<string, unknown>;
      isActive?: boolean;
      published?: boolean;
      displayOrder?: number;
    }) => cmsApi.createCollectionItem(currentProject!.slug, key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-collections"] });
      toast.success("Collection item created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create collection item");
    },
  });
};

export const useUpdateCmsCollectionItem = (key: CmsCollectionKey) => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        title: string;
        slug: string | null;
        payload: Record<string, unknown>;
        isActive: boolean;
        published: boolean;
        displayOrder: number;
      }>;
    }) => cmsApi.updateCollectionItem(currentProject!.slug, key, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-collections"] });
      toast.success("Collection item updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update collection item");
    },
  });
};

export const useDeleteCmsCollectionItem = (key: CmsCollectionKey) => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      cmsApi.deleteCollectionItem(currentProject!.slug, key, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-collections"] });
      toast.success("Collection item deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete collection item");
    },
  });
};

export const useCmsDynamicRoutes = (options?: { enabled?: boolean }) => {
  const { currentProject } = useCurrentProject();
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["cms-dynamic-routes", currentProject?.slug],
    queryFn: () => cmsApi.listDynamicRoutes(currentProject!.slug),
    enabled: !!currentProject && enabled,
  });
};

export const useCmsDynamicRoute = (id: string, options?: { enabled?: boolean }) => {
  const { currentProject } = useCurrentProject();
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["cms-dynamic-routes", currentProject?.slug, id],
    queryFn: () => cmsApi.getDynamicRoute(currentProject!.slug, id),
    enabled: !!currentProject && !!id && enabled,
  });
};

export const useCreateCmsDynamicRoute = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      pattern: string;
      collectionKey: string;
      templateLayoutId?: string | null;
      matchRules: CmsDynamicRouteMatchRule[];
      isActive?: boolean;
    }) => cmsApi.createDynamicRoute(currentProject!.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-dynamic-routes"] });
      toast.success("Dynamic route created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create dynamic route");
    },
  });
};

export const useUpdateCmsDynamicRoute = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        name: string;
        pattern: string;
        collectionKey: string;
        templateLayoutId: string | null;
        matchRules: CmsDynamicRouteMatchRule[];
        isActive: boolean;
      }>;
    }) => cmsApi.updateDynamicRoute(currentProject!.slug, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-dynamic-routes"] });
      toast.success("Dynamic route updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update dynamic route");
    },
  });
};

export const useDeleteCmsDynamicRoute = () => {
  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cmsApi.deleteDynamicRoute(currentProject!.slug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-dynamic-routes"] });
      toast.success("Dynamic route deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete dynamic route");
    },
  });
};

export const useTestCmsDynamicRoute = (path: string, options?: { enabled?: boolean }) => {
  const { currentProject } = useCurrentProject();
  const enabled = options?.enabled ?? true;
  const normalizedPath = path.trim();
  return useQuery({
    queryKey: ["cms-dynamic-routes", "test", currentProject?.slug, normalizedPath],
    queryFn: () => cmsApi.testDynamicRoute(currentProject!.slug, normalizedPath),
    enabled: !!currentProject && !!normalizedPath && enabled,
    retry: false,
  });
};
