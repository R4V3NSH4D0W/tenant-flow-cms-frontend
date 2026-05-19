"use client";

import { useCallback, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FileIcon,
  FolderOpen,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@/lib/shared/react-query";
import { api } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { absoluteApiUrl } from "@/lib/cms/absolute-url";
import { uploadCmsFile } from "@/lib/cms/file-upload";
import { cn } from "@/lib/shared/utils";
import { useCurrentProject } from "@/components/providers/current-project-provider";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServerFile {
  id: string;
  name: string;
  url: string;
  ext: string;
  size?: number;
}

interface FilesListResponse {
  success: boolean;
  files: ServerFile[];
}

type Tab = "upload" | "library" | "url";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** File extensions considered previewable/openable in the browser */
const BROWSER_OPENABLE_EXTS = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif",
  ".svg", ".avif", ".mp4", ".webm", ".mp3", ".wav", ".txt", ".html", ".htm",
]);

function fileExtFromUrl(url: string): string {
  try {
    const pathname = new URL(url, "http://x").pathname;
    const lastDot = pathname.lastIndexOf(".");
    return lastDot >= 0 ? pathname.slice(lastDot).toLowerCase() : "";
  } catch {
    return "";
  }
}

function guessFilename(url: string): string {
  try {
    const parts = new URL(url, "http://x").pathname.split("/");
    const last = parts[parts.length - 1] ?? "";
    // Strip timestamp prefix pattern e.g. 1747619234-abc123-
    return decodeURIComponent(last).replace(/^\d+-[a-z0-9]+-/i, "") || "file";
  } catch {
    return "file";
  }
}

function isBrowserOpenable(url: string): boolean {
  return BROWSER_OPENABLE_EXTS.has(fileExtFromUrl(url));
}

function isValidFileUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (t.startsWith("/")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CmsFileUploadField({
  value,
  onChange,
  inputId,
  label = "File",
  hideLabel = false,
  disabled = false,
}: {
  value: string;
  onChange: (url: string) => void;
  inputId: string;
  label?: string;
  hideLabel?: boolean;
  disabled?: boolean;
}) {
  const { currentProject } = useCurrentProject();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [tab, setTab] = useState<Tab>("upload");

  // Fetch server files when library tab is active
  const filesQuery = useQuery({
    queryKey: ["media-files", currentProject?.slug],
    queryFn: () =>
      api.get<FilesListResponse>(
        `/api/v1/admin/projects/${currentProject!.slug}/media/gallery/files/list`,
      ),
    enabled: !!currentProject && tab === "library",
    staleTime: 30_000,
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const slug = currentProject?.slug;
      if (!slug) {
        toast.error("Project context not found. Please refresh and try again.");
        return;
      }
      setUploading(true);
      try {
        const url = await uploadCmsFile(file, slug);
        onChange(url);
        toast.success(`"${file.name}" uploaded successfully`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange, currentProject?.slug],
  );

  const handleAddLink = useCallback(() => {
    const t = linkDraft.trim();
    if (!isValidFileUrl(t)) {
      toast.error("Enter a valid https URL or a path starting with /");
      return;
    }
    onChange(t);
    setLinkDraft("");
    toast.success("File link saved");
  }, [linkDraft, onChange]);

  const handleLibraryPick = useCallback(
    (file: ServerFile) => {
      onChange(file.url);
      toast.success(`"${file.name}" selected`);
    },
    [onChange],
  );

  const hasValue = Boolean(value.trim());
  const absoluteUrl = hasValue ? absoluteApiUrl(value.trim()) : "";
  const filename = hasValue ? guessFilename(value.trim()) : "";
  const openable = hasValue && isBrowserOpenable(value.trim());
  const ext = hasValue ? fileExtFromUrl(value.trim()) : "";

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      {!hideLabel ? <Label htmlFor={inputId}>{label}</Label> : null}

      {/* Current file preview */}
      {hasValue ? (
        <div className="flex items-start gap-3 rounded-md border bg-background p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
            <FileIcon className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <p
              className="break-all font-mono text-[11px] leading-snug text-foreground"
              title={value.trim()}
            >
              {filename}
            </p>
            {ext ? (
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {ext.replace(".", "")}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={absoluteUrl}
                download={filename}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>

              {openable ? (
                <a
                  href={absoluteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in new tab
                </a>
              ) : null}

              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                disabled={disabled}
                onClick={() => onChange("")}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab strip */}
      <div className="flex gap-0.5 rounded-md border bg-muted/30 p-0.5">
        {(
          [
            { key: "upload" as const, label: "Upload file", icon: FileIcon },
            { key: "library" as const, label: "From server", icon: FolderOpen },
            { key: "url" as const, label: "Paste URL", icon: null },
          ]
        ).map(({ key, label: tabLabel, icon: Icon }) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-3 w-3 shrink-0" />}
            {tabLabel}
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {tab === "upload" && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed bg-muted/20 p-3">
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            aria-hidden
            onChange={handleFileChange}
            accept="*/*"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileIcon className="h-4 w-4" />
            )}
            {uploading ? "Uploading…" : hasValue ? "Replace file" : "Choose file"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            PDF, DOCX, XLSX, PNG, MP4 and any other type. Max 50 MB.
          </p>
        </div>
      )}

      {/* From server tab */}
      {tab === "library" && (
        <div className="rounded-md border bg-background">
          {filesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading files…
            </div>
          ) : filesQuery.isError ? (
            <p className="px-3 py-4 text-xs text-destructive">
              Failed to load files. Is the backend running?
            </p>
          ) : !filesQuery.data?.files?.length ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No files uploaded yet. Use the{" "}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setTab("upload")}
              >
                Upload file
              </button>{" "}
              tab to add one.
            </div>
          ) : (
            <ul className="max-h-56 divide-y overflow-y-auto">
              {filesQuery.data.files.map((file) => {
                const isSelected = value === file.url;
                return (
                  <li key={file.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleLibraryPick(file)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50",
                        isSelected && "bg-primary/5",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border bg-muted text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        {file.ext || "?"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium leading-snug">
                          {file.name.replace(/^\d+-[a-z0-9]+-/i, "")}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {formatBytes(file.size)}
                          {isSelected ? " · Selected" : ""}
                        </span>
                      </span>
                      {isSelected && (
                        <span className="shrink-0 text-[10px] font-semibold text-primary">✓</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Paste URL tab */}
      {tab === "url" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Input
            id={inputId}
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            placeholder="https://… or /api/media/…"
            spellCheck={false}
            autoComplete="off"
            disabled={disabled}
            className="min-w-0 flex-1 font-mono text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddLink();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 sm:self-stretch"
            disabled={disabled}
            onClick={handleAddLink}
          >
            Use URL
          </Button>
        </div>
      )}
    </div>
  );
}
