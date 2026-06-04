"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { useMutation, useQuery, useQueryClient } from "@/lib/shared/react-query";
import { cmsApi } from "@/lib/cms/api";
import { absoluteTenantApiUrl } from "@/lib/cms/absolute-url";
import type { CmsFormDefinition, CmsFormField, CmsFormSubmission } from "@/lib/cms/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ChevronLeft,
  Trash2,
  FileSpreadsheet,
  Calendar,
  Eye,
  X,
  Database,
  ArrowDownToLine,
  Mail,
  Loader2,
} from "lucide-react";

export default function FormSubmissionsPage({
  params: paramsPromise,
}: {
  params: Promise<{ key: string }>;
}) {
  const params = use(paramsPromise);
  const formKey = params.key;

  const { currentProject } = useCurrentProject();
  const queryClient = useQueryClient();
  const slug = currentProject?.slug ?? "";
  const primaryDomain = currentProject?.primaryDomain ?? null;

  const submitEndpoint = absoluteTenantApiUrl(
    `/api/v1/forms/${formKey}/submit`,
    { slug, primaryDomain },
  );

  // Dynamic state for selected submission details
  const [selectedSubmission, setSelectedSubmission] = useState<CmsFormSubmission | null>(null);

  // Fetch submissions and form details
  const { data, isLoading } = useQuery({
    queryKey: ["cms-submissions", slug, formKey],
    queryFn: () => cmsApi.listSubmissions(slug, formKey),
    enabled: !!slug && !!formKey,
  });

  const deleteSubmission = useMutation({
    mutationFn: (submissionId: string) => cmsApi.deleteSubmission(slug, formKey, submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-submissions", slug, formKey] });
      toast.success("Submission deleted successfully");
      if (selectedSubmission) setSelectedSubmission(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete submission");
    },
  });

  const handleDelete = (submissionId: string) => {
    if (confirm("Are you sure you want to delete this submission permanently?")) {
      deleteSubmission.mutate(submissionId);
    }
  };

  const exportToCsv = () => {
    if (!data?.submissions || !data?.form) return;
    const form = data.form;
    const schema: CmsFormField[] = Array.isArray(form.schema) ? form.schema : [];
    const headers = ["ID", "Submitted At", ...schema.map((f) => f.label || f.key)];

    const rows = data.submissions.map((sub) => {
      const payload = sub.payload || {};
      return [
        sub.id,
        new Date(sub.createdAt).toLocaleString(),
        ...schema.map((f) => {
          const val = payload[f.key];
          return val === null || val === undefined ? "" : `"${String(val).replace(/"/g, '""')}"`;
        }),
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${formKey}_submissions_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!slug) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <FileSpreadsheet className="size-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">No Project Context</h2>
        <p className="text-sm text-muted-foreground">Select a project context to view form submissions.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Loading submissions spreadsheet...
      </div>
    );
  }

  const form = data?.form as CmsFormDefinition | undefined;
  const submissions: CmsFormSubmission[] = (data?.submissions as CmsFormSubmission[]) || [];
  const schema: CmsFormField[] = form && Array.isArray(form.schema) ? form.schema : [];

  return (
    <div className="flex w-full max-w-none flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="h-8 -ml-2.5">
              <Link href="/dashboard/cms/forms">
                <ChevronLeft className="size-4 mr-1" /> All Forms
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-500" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight">{form?.name || "Submissions"}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {formKey}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            View, inspect, and export lead submissions collected for this form.
          </p>
        </div>

        {submissions.length > 0 && (
          <Button onClick={exportToCsv} variant="outline" className="h-10 gap-2">
            <ArrowDownToLine className="size-4 text-emerald-500" /> Export CSV
          </Button>
        )}
      </div>

      {submissions.length === 0 ? (
        <Card className="border border-dashed py-14">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3.5 rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20">
              <Database className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base">No Submissions Recorded</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Your endpoint is waiting! Submit a POST request to test the database collection.
              </p>
            </div>
            <div className="rounded border bg-muted/40 p-3 mt-4 text-[10px] font-mono select-all">
              curl -X POST {submitEndpoint} \
              <br />
              &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \
              <br />
              &nbsp;&nbsp;-d &apos;{"{"}
              {" "}{schema.map((f) => `"${f.key}": "value"`).join(", ")}{" "}
              {"}"}&apos;
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {/* Submissions Table / Grid (2 Cols) */}
          <div className="lg:col-span-2 overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3">Submitted At</th>
                  {schema.slice(0, 3).map((f) => (
                    <th key={f.key} className="px-4 py-3 truncate max-w-44">
                      {f.label || f.key}
                    </th>
                  ))}
                  {schema.length > 3 && <th className="px-4 py-3">...</th>}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.map((sub) => {
                  const payload = sub.payload || {};
                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-muted/10 cursor-pointer transition-colors ${
                        selectedSubmission?.id === sub.id ? "bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap text-xs flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="size-3.5" />
                        {new Date(sub.createdAt).toLocaleString()}
                      </td>
                      {schema.slice(0, 3).map((f) => {
                        const val = payload[f.key];
                        return (
                          <td key={f.key} className="px-4 py-3 truncate max-w-44 font-medium text-foreground">
                            {val === null || val === undefined
                              ? ""
                              : typeof val === "boolean"
                              ? val
                                ? "Yes"
                                : "No"
                              : String(val)}
                          </td>
                        );
                      })}
                      {schema.length > 3 && (
                        <td className="px-4 py-3 text-muted-foreground text-xs font-bold">+{schema.length - 3} fields</td>
                      )}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedSubmission(sub)}
                            className="size-8"
                          >
                            <Eye className="size-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sub.id)}
                            disabled={deleteSubmission.isPending}
                            className="size-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submission Details Inspector Sidebar */}
          <div>
            {selectedSubmission ? (
              <Card className="border border-border bg-card shadow-sm sticky top-6">
                <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Mail className="size-4 text-primary" /> Submission Details
                    </CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                      <Calendar className="size-3" />
                      {new Date(selectedSubmission.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedSubmission(null)}
                    className="size-7"
                  >
                    <X className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Fields list */}
                  <div className="space-y-3">
                    {schema.map((f) => {
                      const val = selectedSubmission.payload[f.key];
                      return (
                        <div key={f.key} className="space-y-1">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                            {f.label || f.key}
                          </span>
                          <p className="text-sm font-medium bg-muted/20 border rounded p-2.5 leading-relaxed text-foreground whitespace-pre-wrap">
                            {val === null || val === undefined
                              ? <em className="text-muted-foreground text-xs">null</em>
                              : typeof val === "boolean"
                              ? val
                                ? "Yes"
                                : "No"
                              : String(val)}
                          </p>
                        </div>
                      );
                    })}

                    {/* Extra fields in payload that are not in schema */}
                    {Object.keys(selectedSubmission.payload).some((k) => !schema.some((f) => f.key === k)) && (
                      <div className="border-t pt-3 mt-4 space-y-2">
                        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">
                          Additional Metadata Fields
                        </span>
                        {Object.keys(selectedSubmission.payload)
                          .filter((k) => !schema.some((f) => f.key === k))
                          .map((k) => {
                            const val = selectedSubmission.payload[k];
                            return (
                              <div key={k} className="space-y-0.5">
                                <span className="text-xs font-semibold text-muted-foreground">{k}</span>
                                <p className="text-xs bg-muted/10 border rounded p-2 text-foreground break-all">
                                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(selectedSubmission.id)}
                      disabled={deleteSubmission.isPending}
                      className="h-8 gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    >
                      <Trash2 className="size-3.5" /> Delete Submission
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-dashed py-10 bg-muted/10">
                <CardContent className="text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Eye className="size-5 opacity-40 text-muted-foreground" />
                  <span>Select any submission row in the spreadsheet to inspect values, check full messages, or view metadata.</span>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
