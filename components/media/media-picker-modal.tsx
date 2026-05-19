"use client";

import { useEffect, useState } from "react";
import { useCurrentProject } from "@/components/providers/current-project-provider";
import { useMutation, useQuery, useQueryClient } from "@/lib/shared/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, FileIcon, Folder } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn, getImageUrl } from "@/lib/shared/utils";

import { api } from "@/lib/fetcher";
import {
  imageFileFromClipboard,
  isPasteTargetEditable,
  normalizeClipboardImageFile,
} from "@/lib/media/clipboard";

interface MediaLibraryResponse {
  folders: string[];
  files: {
    id: string;
    name: string;
    url: string;
    [key: string]: unknown;
  }[];
}

interface MediaPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
}

export function MediaPickerModal({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
}: MediaPickerModalProps) {
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["media-gallery-picker", currentPath],
    queryFn: async () => {
      return api.get<MediaLibraryResponse>(`/api/v1/admin/projects/${currentProject!.slug}/media/gallery/list`, {
        params: { folder: currentPath },
      });
    },
    enabled: open && !!currentProject,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post(`/api/v1/admin/projects/${currentProject!.slug}/media/gallery/upload?folder=${encodeURIComponent(currentPath)}`, formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["media-gallery-picker"] });
      void queryClient.invalidateQueries({ queryKey: ["media-gallery"] });
      toast.success("Image pasted from clipboard");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      if (uploadMutation.isPending) return;
      if (isPasteTargetEditable(e.target)) return;
      const raw = imageFileFromClipboard(e.clipboardData);
      if (!raw) return;
      e.preventDefault();
      uploadMutation.mutate(normalizeClipboardImageFile(raw));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, uploadMutation.mutate, uploadMutation.isPending]);

  const handleNavigate = (folderName: string) => {
    const newPath =
      currentPath === "/" ? folderName : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
  };

  const handleUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/");
    parts.pop();
    const parent = parts.join("/") || "/";
    setCurrentPath(parent);
  };

  const toggleSelection = (fileUrl: string) => {
    if (multiple) {
      setSelectedUrls((prev) =>
        prev.includes(fileUrl)
          ? prev.filter((u) => u !== fileUrl)
          : [...prev, fileUrl],
      );
    } else {
      setSelectedUrls([fileUrl]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedUrls);
    setSelectedUrls([]);
    onOpenChange(false);
  };

  const folders = data?.folders || [];
  const files = data?.files || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] min-w-[95vh] flex-col">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
          <DialogDescription className="text-left text-xs">
            Paste a screenshot with Ctrl+V / ⌘V to upload into the current folder,
            then select it below.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 flex items-center gap-2">
          {currentPath !== "/" && (
            <Button variant="ghost" size="icon" onClick={handleUp}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <span className="bg-muted rounded px-2 py-1 text-sm">
            {currentPath}
          </span>
        </div>

        <div className="bg-muted/10 flex-1 overflow-y-auto rounded-md border p-4">
          {isLoading ? (
            <div className="py-10 text-center">Loading...</div>
          ) : (
            <div className="grid grid-cols-3 gap-4 md:grid-cols-5">
              {folders.map((folder: string) => (
                <div
                  key={folder}
                  className="bg-card hover:bg-muted flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-colors"
                  onClick={() => handleNavigate(folder)}
                >
                  <Folder className="h-10 w-10 fill-blue-500/20 text-blue-500" />
                  <span className="w-full truncate text-center text-xs font-medium">
                    {folder}
                  </span>
                </div>
              ))}

              {files.map((file: { id: string; url: string; name: string; isImage?: boolean }) => {
                const isSelected = selectedUrls.includes(file.url);
                return (
                  <div
                    key={file.id}
                    className={cn(
                      "group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-card",
                      isSelected ? "ring-primary ring-2" : "hover:shadow-md",
                    )}
                    onClick={() => toggleSelection(file.url)}
                  >
                    {file.isImage !== false ? (
                      <Image
                        src={getImageUrl(file.url)}
                        alt={file.name}
                        fill
                        sizes="(max-width: 768px) 33vw, 20vw"
                        quality={70}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted p-3">
                        <FileIcon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                        <span className="rounded bg-muted-foreground/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {file.name.split(".").pop() ?? "file"}
                        </span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-full p-0.5">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 truncate bg-black/60 p-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {file.name}
                    </div>
                  </div>
                );
              })}

              {folders.length === 0 && files.length === 0 && (
                <div className="text-muted-foreground col-span-full py-10 text-center">
                  Empty Folder
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {selectedUrls.length} selected
          </div>
          <Button onClick={handleConfirm} disabled={selectedUrls.length === 0}>
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
