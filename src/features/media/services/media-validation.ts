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
      const repositoryName = pathParts[1]?.toLowerCase().endsWith(".git") ? pathParts[1].slice(0, -4) : pathParts[1];
      const validName = /^[A-Za-z0-9_.-]+$/;
      return (
        url.protocol === "https:" &&
        ["github.com", "www.github.com"].includes(url.hostname.toLowerCase()) &&
        !url.username &&
        !url.password &&
        !url.port &&
        !url.search &&
        !url.hash &&
        pathParts.length === 2 &&
        validName.test(pathParts[0]) &&
        Boolean(repositoryName && validName.test(repositoryName))
      );
    } catch {
      return false;
    }
  }, "Enter a public GitHub repository URL in the form https://github.com/owner/repository.");

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
