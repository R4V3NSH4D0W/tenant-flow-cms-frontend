"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Database, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCmsCollections, useDeleteCmsCollection } from "@/hooks/use-cms";
import type { CmsCollectionDefinition } from "@/lib/cms/api";
import { absoluteTenantApiUrl } from "@/lib/cms/absolute-url";
import {
  publicCmsCollectionApiPath,
  trimPublicApiPathDisplay,
} from "@/lib/cms/public-site-api-paths";

export default function CmsCollectionsPage() {
  const { currentProject } = useCurrentProject();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<CmsCollectionDefinition | null>(null);
  const { data: defsRes, isLoading } = useCmsCollections({ q: search });
  const deleteCollection = useDeleteCmsCollection();
  const collections = defsRes?.collections ?? [];

  return (
    <div className="flex w-full flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
      <AlertDialog
        open={deleteTarget !== null}
        title={
          deleteTarget
            ? `Delete collection "${deleteTarget.name}"?`
            : "Delete collection?"
        }
        description="This deletes the collection definition and its items from the CMS."
        confirmLabel="Delete collection"
        confirmationText={deleteTarget?.key}
        confirmationLabel="Type the collection key to confirm."
        destructive
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={
          deleteTarget
            ? async () => {
                await deleteCollection.mutateAsync(deleteTarget.key);
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
            <Database className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            List all collections. Open one to add or edit collection items.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/cms/collections/new">
            <Plus className="mr-2 h-4 w-4" />
            New collection
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search collections by name or key"
          className="w-[320px] max-w-full bg-background"
        />
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Searching..." : `${collections.length} result(s)`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading collections...
        </div>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No collections yet. Create your first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <Card key={collection.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{collection.name}</CardTitle>
                <p className="font-mono text-xs text-muted-foreground">{collection.key}</p>
                <a
                  href={`${absoluteTenantApiUrl(publicCmsCollectionApiPath(collection.key), {
                    slug: currentProject?.slug,
                    primaryDomain: currentProject?.primaryDomain,
                  })}?limit=10&offset=0`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 font-mono text-xs text-primary underline-offset-2 hover:underline"
                  title="Open public collection API"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="min-w-0 truncate">
                    {trimPublicApiPathDisplay(
                      `${publicCmsCollectionApiPath(collection.key)}?limit=10&offset=0`,
                    )}
                  </span>
                </a>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link href={`/dashboard/cms/collections/${encodeURIComponent(collection.key)}`}>
                    Manage data
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link
                    href={`/dashboard/cms/collections/builder?key=${encodeURIComponent(collection.key)}`}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit schema
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteTarget(collection)}
                  disabled={deleteCollection.isPending}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
