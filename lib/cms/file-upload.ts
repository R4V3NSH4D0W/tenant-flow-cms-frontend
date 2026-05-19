import { api } from "@/lib/fetcher";

function parseUploadUrl(res: unknown): string | null {
  if (!res || typeof res !== "object") return null;
  const o = res as Record<string, unknown>;
  if (typeof o.url === "string" && o.url) return o.url;
  if (o.data && typeof o.data === "object") {
    const d = o.data as Record<string, unknown>;
    if (typeof d.url === "string" && d.url) return d.url;
  }
  if (o.file && typeof o.file === "object") {
    const f = o.file as Record<string, unknown>;
    if (typeof f.url === "string" && f.url) return f.url;
  }
  return null;
}

/**
 * Uploads any file (PDF, docx, xlsx, etc.) to the project's `files/` subfolder.
 * Files are stored at `assets/uploads/{projectSlug}/files/` and served publicly
 * at `/api/media/{projectSlug}/files/...`.
 *
 * @returns The public URL of the uploaded file.
 */
export async function uploadCmsFile(file: File, projectSlug: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<unknown>(
    `/api/v1/admin/projects/${projectSlug}/media/gallery/files/upload`,
    formData,
  );
  const url = parseUploadUrl(res);
  if (!url) {
    throw new Error("Upload did not return a URL");
  }
  return url;
}
