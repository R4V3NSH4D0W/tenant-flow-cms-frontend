"use client";

import Link from "next/link";
import { GitBranch, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { CmsPublicApiLink } from "@/components/cms/cms-public-api-link";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCmsDynamicRoutes, useDeleteCmsDynamicRoute } from "@/hooks/use-cms";
import type { CmsDynamicRoute } from "@/lib/cms/api";
import {
  examplePathForDynamicRoutePattern,
  publicCmsDynamicRouteApiPath,
} from "@/lib/cms/public-site-api-paths";

export default function CmsDynamicRoutesPage() {
  const { currentProject } = useCurrentProject();
  const { data, isLoading } = useCmsDynamicRoutes();
  const deleteRoute = useDeleteCmsDynamicRoute();
  const [deleteTarget, setDeleteTarget] = useState<CmsDynamicRoute | null>(null);
  const routes = data?.routes ?? [];

  return (
    <div className="flex w-full flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
      <AlertDialog
        open={deleteTarget !== null}
        title={
          deleteTarget ? `Delete route "${deleteTarget.name}"?` : "Delete route?"
        }
        description="This removes the dynamic route definition."
        confirmLabel="Delete route"
        confirmationText={deleteTarget?.pattern}
        confirmationLabel="Type the route pattern to confirm."
        destructive
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={
          deleteTarget
            ? async () => {
                await deleteRoute.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }
            : undefined
        }
      />

      <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
        <Link href="/dashboard/cms">← CMS home</Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Dynamic Routes</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Map URL path shapes to one collection row. Optional layout returns a shared section schema with the
            item.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/cms/dynamic-routes/new">
            <Plus className="mr-2 h-4 w-4" />
            New route
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading dynamic routes...
        </div>
      ) : routes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No dynamic routes yet. Create your first route.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routes.map((route) => (
            <Card key={route.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{route.name}</CardTitle>
                <p className="font-mono text-xs text-muted-foreground">{route.pattern}</p>
                <CmsPublicApiLink
                  apiPath={publicCmsDynamicRouteApiPath(
                    examplePathForDynamicRoutePattern(route.pattern),
                  )}
                  tenantSlug={currentProject?.slug}
                  tenantDomain={currentProject?.primaryDomain}
                  titleHint="GET: returns matched collection item (and optional layout) for path="
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{route.collectionKey}</Badge>
                  {route.isActive ? (
                    <Badge className="bg-green-600/90 text-white">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/cms/dynamic-routes/${route.id}`}>Edit</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(route)}
                    disabled={deleteRoute.isPending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
