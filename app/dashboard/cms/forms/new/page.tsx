"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { useMutation, useQuery, useQueryClient } from "@/lib/shared/react-query";
import { cmsApi } from "@/lib/cms/api";
import type { CmsFormField } from "@/lib/cms/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  Trash2,
  ChevronLeft,
  Mail,
  FileCode,
  Save,
  Sparkles,
  Loader2,
} from "lucide-react";

// ─── Shared types ────────────────────────────────────────────────────────────

interface FormField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string; // comma-separated for select type
}

interface FormSavePayload {
  key: string;
  name: string;
  schema: CmsFormField[];
  emailSubjectReceiver: string | null;
  emailTemplateReceiver: string | null;
  emailSubjectSender: string | null;
  emailTemplateSender: string | null;
  emailEnabled: boolean;
}

interface InitialFormValues {
  name: string;
  formKey: string;
  fields: FormField[];
  emailSubjectReceiver: string;
  emailTemplateReceiver: string;
  emailSubjectSender: string;
  emailTemplateSender: string;
  emailEnabled: boolean;
}

const DEFAULT_VALUES: InitialFormValues = {
  name: "",
  formKey: "",
  fields: [
    { key: "email", label: "Email Address", type: "email", required: true },
    { key: "message", label: "Message", type: "textarea", required: true },
  ],
  emailSubjectReceiver: "",
  emailTemplateReceiver: "",
  emailSubjectSender: "",
  emailTemplateSender: "",
  emailEnabled: false,
};

// ─── Inner form (state initialized once from props — no useEffect needed) ────

function FormBuilderInner({
  initial,
  isEditing,
  editKey,
  slug,
}: {
  initial: InitialFormValues;
  isEditing: boolean;
  editKey: string | null;
  slug: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(initial.name);
  const [key, setKey] = useState(initial.formKey);
  const [isKeyCustomized, setIsKeyCustomized] = useState(isEditing);
  const [fields, setFields] = useState<FormField[]>(initial.fields);
  const [emailSubjectReceiver, setEmailSubjectReceiver] = useState(initial.emailSubjectReceiver);
  const [emailTemplateReceiver, setEmailTemplateReceiver] = useState(initial.emailTemplateReceiver);
  const [emailSubjectSender, setEmailSubjectSender] = useState(initial.emailSubjectSender);
  const [emailTemplateSender, setEmailTemplateSender] = useState(initial.emailTemplateSender);
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s_-]/g, "")
      .replace(/[\s_-]+/g, "_")
      .replace(/(^_|_$)/g, "");

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && !isKeyCustomized) {
      setKey(slugify(val));
    }
  };

  const handleKeyChange = (val: string) => {
    setKey(val.toLowerCase());
    setIsKeyCustomized(true);
  };

  const handleAddField = () => {
    setFields((prev) => [
      ...prev,
      { key: `field_${prev.length + 1}`, label: `New Field ${prev.length + 1}`, type: "text", required: false },
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFieldChange = (index: number, changes: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((field, idx) => (idx === index ? { ...field, ...changes } : field))
    );
  };

  const saveForm = useMutation({
    mutationFn: (payload: FormSavePayload) => {
      if (isEditing) {
        return cmsApi.updateForm(slug, editKey!, payload);
      }
      return cmsApi.createForm(slug, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-forms", slug] });
      toast.success(isEditing ? "Form updated successfully" : "Form created successfully");
      router.push("/dashboard/cms/forms");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save form definition");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return void toast.error("Form name is required");
    if (!key.trim()) return void toast.error("Form key is required");
    if (!/^[a-z][a-z0-9_-]{1,63}$/.test(key)) {
      return void toast.error(
        "Form key must start with a lowercase letter and contain only lowercase letters, numbers, hyphens, or underscores"
      );
    }

    const keysSet = new Set<string>();
    for (const f of fields) {
      const k = f.key.trim().toLowerCase();
      if (!k) return void toast.error("All fields must have a key");
      if (!/^[a-z0-9_-]+$/.test(k))
        return void toast.error(`Field key "${k}" is invalid. Use letters, numbers, and underscores only.`);
      if (keysSet.has(k)) return void toast.error(`Duplicate field key: "${k}"`);
      keysSet.add(k);
    }

    const schema = fields.map((f) => ({
      key: f.key.trim().toLowerCase(),
      label: f.label.trim(),
      type: f.type,
      required: f.required,
      ...(f.type === "select"
        ? {
            options: f.options
              ? f.options.split(",").map((opt) => opt.trim()).filter(Boolean)
              : [],
          }
        : {}),
    }));

    saveForm.mutate({
      key: key.trim().toLowerCase(),
      name: name.trim(),
      schema,
      emailSubjectReceiver: emailSubjectReceiver.trim() || null,
      emailTemplateReceiver: emailTemplateReceiver.trim() || null,
      emailSubjectSender: emailSubjectSender.trim() || null,
      emailTemplateSender: emailTemplateSender.trim() || null,
      emailEnabled,
    });
  };

  return (
    <div className="flex w-full max-w-none flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-9">
          <Link href="/dashboard/cms/forms">
            <ChevronLeft className="size-4 mr-1.5" /> Back to forms
          </Link>
        </Button>
      </div>

      <div className="space-y-2 border-b pb-5">
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditing ? `Edit Form: ${name}` : "Create Dynamic Form"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Define fields and configure auto-replies. Save changes to deploy your new endpoint.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Schema and Fields (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode className="size-4 text-primary" /> Form Basics &amp; Properties
              </CardTitle>
              <CardDescription>Give your form a name and key identifier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Form Name</label>
                  <Input
                    placeholder="Contact Us"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Form Key (Slug)</label>
                  <Input
                    placeholder="contact_form"
                    value={key}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    disabled={isEditing}
                    className="h-10 font-mono text-sm"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Unique identifier for API endpoint. Cannot be updated after creation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fields Schema Editor */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-3">
              <div>
                <CardTitle className="text-base">Form Input Fields</CardTitle>
                <CardDescription>Configure labels, names, validation types, and options.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddField} className="h-9 gap-1">
                <Plus className="size-4" /> Add Field
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <div className="text-center py-10 rounded border border-dashed text-sm text-muted-foreground">
                  No input fields yet. Add at least one field.
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 rounded-lg border bg-muted/20 relative group hover:border-primary/40 transition-colors"
                    >
                      <div className="flex-1 w-full space-y-1">
                        <Input
                          placeholder="Field Label (e.g. Full Name)"
                          value={field.label}
                          onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                          className="h-9 text-xs"
                          required
                        />
                      </div>

                      <div className="flex-1 w-full space-y-1">
                        <Input
                          placeholder="field_key"
                          value={field.key}
                          onChange={(e) => handleFieldChange(index, { key: e.target.value })}
                          className="h-9 font-mono text-xs"
                          required
                        />
                      </div>

                      <div className="w-full sm:w-36">
                        <Select
                          value={field.type}
                          onValueChange={(val) => handleFieldChange(index, { type: val })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Short Text</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="email">Email Address</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="tel">Phone Number</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="select">Dropdown Menu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {field.type === "select" && (
                        <div className="w-full sm:w-44">
                          <Input
                            placeholder="Option 1, Option 2, ..."
                            value={field.options || ""}
                            onChange={(e) => handleFieldChange(index, { options: e.target.value })}
                            className="h-9 text-xs"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 shrink-0 py-2 sm:py-0">
                        <input
                          type="checkbox"
                          id={`required-${index}`}
                          checked={field.required}
                          onChange={(e) => handleFieldChange(index, { required: e.target.checked })}
                          className="size-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                        <label
                          htmlFor={`required-${index}`}
                          className="text-xs font-semibold text-muted-foreground select-none cursor-pointer"
                        >
                          Required
                        </label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveField(index)}
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md sm:ml-2"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email Templates Config Column */}
        <div className="space-y-6">
          <Card className="border border-border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <Mail className="size-4" /> Email Integrations
              </CardTitle>
              <CardDescription>
                Customize layout templates and subject headers. Dynamic variables use double braces{" "}
                <code>{"{{field_key}}"}</code> or <code>{"{{all_fields}}"}</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="space-y-0.5">
                  <Label htmlFor="email-enabled" className="text-sm font-semibold">Enable Email Service</Label>
                  <p className="text-xs text-muted-foreground">
                    Send admin notifications and auto-replies upon submission.
                  </p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                />
              </div>

              {emailEnabled && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> Administrative Notification
                    </h3>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Notification Subject</label>
                      <Input
                        placeholder="New Form Submission: {{form_name}}"
                        value={emailSubjectReceiver}
                        onChange={(e) => setEmailSubjectReceiver(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">HTML Body Layout</label>
                      <Textarea
                        placeholder="Provide HTML. Supports {{all_fields}} and custom variables."
                        value={emailTemplateReceiver}
                        onChange={(e) => setEmailTemplateReceiver(e.target.value)}
                        rows={5}
                        className="text-xs font-mono resize-y"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-5">
                    <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Guest Confirmation Auto-Reply
                    </h3>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Confirmation Subject</label>
                      <Input
                        placeholder="We received your submission: {{form_name}}"
                        value={emailSubjectSender}
                        onChange={(e) => setEmailSubjectSender(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">HTML Body Layout</label>
                      <Textarea
                        placeholder="Provide HTML. Sent automatically if guests fill in an 'email' field."
                        value={emailTemplateSender}
                        onChange={(e) => setEmailTemplateSender(e.target.value)}
                        rows={5}
                        className="text-xs font-mono resize-y"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-primary/5 p-3.5 border border-primary/10 text-[11px] leading-relaxed text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <Sparkles className="size-3.5 text-primary" /> Template placeholders:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>
                        <code>{"{{all_fields}}"}</code> : Renders a beautiful HTML layout table of all user submissions automatically
                      </li>
                      <li>
                        <code>{"{{form_name}}"}</code> : Renders form name
                      </li>
                      <li>
                        <code>{"{{field_key}}"}</code> : Renders individual values (e.g. <code>{"{{email}}"}</code>)
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saveForm.isPending}
              className="flex-1 h-11 gap-2 font-medium"
            >
              <Save className="size-4" /> {isEditing ? "Update Form Definition" : "Save Form Definition"}
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              disabled={saveForm.isPending}
              className="h-11 px-5"
            >
              <Link href="/dashboard/cms/forms">Cancel</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Outer shell: fetches data, then mounts inner form once ready ─────────────

export default function FormBuilderPage() {
  const searchParams = useSearchParams();
  const editKey = searchParams.get("edit");
  const isEditing = !!editKey;

  const { currentProject } = useCurrentProject();
  const slug = currentProject?.slug ?? "";

  const { data: editData, isLoading: isEditLoading } = useQuery({
    queryKey: ["cms-form", slug, editKey],
    queryFn: () => cmsApi.getForm(slug, editKey!),
    enabled: !!slug && isEditing && !!editKey,
  });

  if (!slug) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <ClipboardList className="size-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">No Project Context</h2>
        <p className="text-sm text-muted-foreground">Select a project context to build a form.</p>
      </div>
    );
  }

  if (isEditing && isEditLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Loading form editor...
      </div>
    );
  }

  // By this point (isEditing → data has loaded), derive initial values from API
  // response directly — no useEffect, no setState cascade.
  const initial: InitialFormValues = isEditing && editData?.form
    ? {
        name: editData.form.name ?? "",
        formKey: editData.form.key ?? "",
        fields: Array.isArray(editData.form.schema)
          ? (editData.form.schema as CmsFormField[]).map((f) => ({
              key: f.key ?? "",
              label: f.label ?? "",
              type: f.type ?? "text",
              required: !!f.required,
              options: Array.isArray(f.options) ? f.options.join(", ") : f.options ?? "",
            }))
          : DEFAULT_VALUES.fields,
        emailSubjectReceiver: editData.form.emailSubjectReceiver ?? "",
        emailTemplateReceiver: editData.form.emailTemplateReceiver ?? "",
        emailSubjectSender: editData.form.emailSubjectSender ?? "",
        emailTemplateSender: editData.form.emailTemplateSender ?? "",
        emailEnabled: editData.form.emailEnabled !== false,
      }
    : DEFAULT_VALUES;

  // key={editKey ?? "new"} ensures React remounts FormBuilderInner with fresh
  // state if the user navigates between create and edit modes.
  return (
    <FormBuilderInner
      key={editKey ?? "new"}
      initial={initial}
      isEditing={isEditing}
      editKey={editKey}
      slug={slug}
    />
  );
}
