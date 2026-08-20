import { z } from "zod";

export const maxVideoBytes = 100 * 1024 * 1024;

export const supportedVideoMimeTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export const githubRepositoryUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      const pathParts = url.pathname.split("/").filter(Boolean);
      return ["github.com", "www.github.com"].includes(url.hostname) && pathParts.length >= 2;
    } catch {
      return false;
    }
  }, "Enter a public GitHub repository URL.");

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateVideoFile(file: File) {
  if (!supportedVideoMimeTypes.has(file.type)) {
    return "Choose an MP4, WebM, or QuickTime video.";
  }

  if (file.size > maxVideoBytes) {
    return `Video must be ${formatBytes(maxVideoBytes)} or smaller.`;
  }

  return null;
}
