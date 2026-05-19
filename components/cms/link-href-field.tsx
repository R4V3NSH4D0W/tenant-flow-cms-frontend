"use client";

import { useRef, useState, useCallback } from "react";
import {
  FileIcon,
  FolderOpen,
  Globe,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@/lib/shared/react-query";
import { api } from "@/lib/fetcher";
import { absoluteApiUrl } from "@/lib/cms/absolute-url";
import { uploadCmsFile } from "@/lib/cms/file-upload";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  ext: string;
  size?: number;
}

interface FilesListResponse {
  success: boolean;
  files: UploadedFile[];
}

type Mode = "url" | "upload" | "library";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isMediaUrl(url: string): boolean {
  return url.includes("/api/media/");
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A rich href input supporting three modes:
 *  - **URL**    — type or paste any URL (internal path or external link)
 *  - **Upload** — upload any file to the project media server; href = uploaded URL
 *  - **Library**— pick from previously uploaded files
 *
 * Used inside link fields in both the page editor and the layout builder defaults.
 */
export function LinkHrefField({
  id,
  value,
  onChange,
  disabled = false,
  onTargetChange,
  defaultTab,
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  /** Optional: called with "_blank" when a file is attached so the link opens in a new tab. */
  onTargetChange?: (target: string) => void;
  /** Hint from the schema: start on this tab. "file" opens upload/library; "url" opens URL input. */
  defaultTab?: "url" | "file";
}) {
  const { currentProject } = useCurrentProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Start on the tab that matches the schema author's intent, or the URL tab by default
  const [mode, setMode] = useState<Mode>(() =>
    defaultTab === "file" ? "library" : "url",
  );

  // Fetch uploaded files — only when library mode is active
  const filesQuery = useQuery({
    queryKey: ["media-files", currentProject?.slug],
    queryFn: () =>
      api.get<FilesListResponse>(
        `/api/v1/admin/projects/${currentProject!.slug}/media/gallery/files/list`,
      ),
    enabled: !!currentProject && mode === "library",
    staleTime: 30_000,
  });

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const slug = currentProject?.slug;
      if (!slug) {
        toast.error("Project context not found.");
        return;
      }
      setUploading(true);
      try {
        const url = await uploadCmsFile(file, slug);
        onChange(url);
        onTargetChange?.("_blank");
        toast.success(`"${file.name}" uploaded`);
        setMode("url"); // switch back to URL mode to show the result
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange, onTargetChange, currentProject?.slug],
  );

  const handleLibraryPick = useCallback(
    (file: UploadedFile) => {
      onChange(file.url);
      onTargetChange?.("_blank");
      setMode("url");
      toast.success(`"${file.name}" selected`);
    },
    [onChange, onTargetChange],
  );

  return (
    <div className="space-y-2">
      {/* Mode tab strip */}
      <div className="flex gap-1 rounded-md border bg-muted/30 p-0.5">
        {(
          [
            { key: "url", label: "URL", icon: Globe },
            { key: "upload", label: "Upload file", icon: FileIcon },
            { key: "library", label: "From server", icon: FolderOpen },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => setMode(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
              mode === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* URL mode */}
      {mode === "url" && (
        <div className="flex items-center gap-1.5">
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or /path/to/page"
            type="url"
            spellCheck={false}
            autoComplete="off"
            disabled={disabled}
            className="min-w-0 flex-1 font-mono text-xs"
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onChange("")}
              disabled={disabled}
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear</span>
            </Button>
          )}
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed bg-muted/20 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            className="sr-only"
            aria-hidden
            onChange={handleFileUpload}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileIcon className="h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Choose file to upload"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Any file type (PDF, DOCX, MP4, …). Max 50 MB. The file is uploaded
            to your media server and the URL is used as the link href.
          </p>
          {value && isMediaUrl(value) && (
            <p className="break-all font-mono text-[10px] text-muted-foreground">
              Current: {value}
            </p>
          )}
        </div>
      )}

      {/* Library mode */}
      {mode === "library" && (
        <div className="rounded-md border bg-background">
          {filesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading files…
            </div>
          ) : filesQuery.isError ? (
            <p className="px-3 py-4 text-xs text-destructive">
              Failed to load files. Check the backend is running.
            </p>
          ) : !filesQuery.data?.files?.length ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No files uploaded yet. Use the{" "}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setMode("upload")}
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
                      {/* Extension badge */}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border bg-muted text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        {file.ext || "?"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium leading-snug">
                          {/* Strip timestamp prefix (e.g. 1747619234-abc123-) */}
                          {file.name.replace(/^\d+-[a-z0-9]+-/, "")}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {formatBytes(file.size)}
                          {isSelected ? " · Selected" : ""}
                        </span>
                      </span>
                      {isSelected && (
                        <span className="shrink-0 text-[10px] font-semibold text-primary">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {/* Preview of current external URL if not a media URL */}
          {value && !isMediaUrl(value) && (
            <div className="border-t px-3 py-2">
              <p className="text-[10px] text-muted-foreground">
                Current href: <span className="font-mono">{value}</span> — not a
                server file, pick from the list above to replace it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hint when a file URL is set */}
      {value && isMediaUrl(value) && mode === "url" && (
        <p className="text-[10px] text-muted-foreground">
          📎 File attached — link will open or download it (target set to new tab)
        </p>
      )}
    </div>
  );
}
