"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { useMutation, useQuery, useQueryClient } from "@/lib/shared/react-query";
import { cmsApi } from "@/lib/cms/api";
import { absoluteTenantApiUrl } from "@/lib/cms/absolute-url";
import type { CmsFormDefinition } from "@/lib/cms/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Plus, Trash2, Eye, Settings2, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { ProjectSmtpSettingsCard } from "@/components/dashboard/projects/smtp-settings";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";


export default function FormsPage() {
  const { currentProject, currentAccess } = useCurrentProject();
  const { isAdmin } = useCurrentUser();
  const queryClient = useQueryClient();
  const slug = currentProject?.slug ?? "";

  const canManageProject = isAdmin || currentAccess?.canManageProject === true;
  const primaryDomain = currentProject?.primaryDomain ?? null;


  const [formToDelete, setFormToDelete] = useState<{ key: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cms-forms", slug],
    queryFn: () => cmsApi.listForms(slug),
    enabled: !!slug,
  });

  const deleteForm = useMutation({
    mutationFn: (formKey: string) => cmsApi.deleteForm(slug, formKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-forms", slug] });
      toast.success("Form deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete form");
    },
  });

  if (!slug) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <ClipboardList className="size-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">No Project Context</h2>
        <p className="text-sm text-muted-foreground">Select a project to access its forms.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between border-b pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight">Forms & Lead Gen</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Build custom contact and feedback forms. Form submissions are saved in your tenant database and notify you via SMTP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 cursor-pointer">
                <Settings2 className="size-4 text-muted-foreground" /> Mail Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-transparent">
              <DialogTitle className="sr-only">Mail Settings</DialogTitle>
              <DialogDescription className="sr-only">Configure outgoing SMTP mail server settings.</DialogDescription>
              <ProjectSmtpSettingsCard
                projectSlug={slug}
                canManage={canManageProject}
              />
            </DialogContent>
          </Dialog>

          <Button asChild className="h-10 gap-2">
            <Link href="/dashboard/cms/forms/new">
              <Plus className="size-4" /> Create Form
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading forms...
        </div>
      ) : !data?.forms || data.forms.length === 0 ? (
        <Card className="border border-dashed py-14">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10 text-primary">
              <ClipboardList className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">No Forms Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Create a form, embed it into your site with our Hono submission route, and collect user submissions dynamically.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/dashboard/cms/forms/new">
                <Plus className="size-4 mr-2" /> Build Your First Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.forms.map((form: CmsFormDefinition) => {
            const fieldsCount = Array.isArray(form.schema) ? form.schema.length : 0;
            return (
              <Card key={form.id} className="border border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base truncate font-semibold">{form.name}</CardTitle>
                    <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {form.key}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pt-1.5 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      <Settings2 className="size-3.5 text-muted-foreground" /> {fieldsCount} {fieldsCount === 1 ? "field" : "fields"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${form.emailEnabled !== false ? "bg-emerald-500" : "bg-zinc-400"}`} />
                      {form.emailEnabled !== false ? "Email active" : "Email disabled"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-2 pb-4 space-y-4">
                  <div className="rounded border bg-muted/30 p-2.5 text-[11px] font-mono break-all leading-relaxed">
                    <span className="text-muted-foreground">POST</span>
                    <br />
                    <span className="font-semibold text-foreground select-all">
                      {absoluteTenantApiUrl(`/api/v1/forms/${form.key}/submit`, { slug, primaryDomain })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 border-t pt-3.5">
                    <Button variant="outline" size="sm" asChild className="flex-1 h-8 text-xs gap-1.5">
                      <Link href={`/dashboard/cms/forms/${form.key}`}>
                        <FileSpreadsheet className="size-3.5 text-emerald-500" /> Submissions
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
                      <Link href={`/dashboard/cms/forms/new?edit=${form.key}`}>
                        <Eye className="size-3.5 text-primary" /> Edit
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormToDelete({ key: form.key, name: form.name })}
                      disabled={deleteForm.isPending}
                      className="h-8 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!formToDelete}
        onOpenChange={(open) => {
          if (!open) setFormToDelete(null);
        }}
        title="Delete Form Definition"
        description={
          <span>
            Are you sure you want to delete the form <strong>{formToDelete?.name}</strong>? This action is irreversible and will delete all associated submissions too.
          </span>
        }
        confirmLabel={deleteForm.isPending ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (formToDelete) {
            deleteForm.mutate(formToDelete.key);
          }
        }}
      />
    </div>
  );
}
