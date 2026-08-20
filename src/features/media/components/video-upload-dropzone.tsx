"use client";

import { Upload, X } from "lucide-react";
import { formatBytes } from "@/features/media/services/media-validation";
import { cn } from "@/lib/utils/cn";

type VideoUploadDropzoneProps = {
  label: string;
  description: string;
  file: File | null;
  previewUrl: string | null;
  error?: string | null;
  progress?: number;
  state?: string;
  tone?: "employer" | "candidate";
  onFile: (file: File | null) => void;
};

export function VideoUploadDropzone({
  label,
  description,
  file,
  previewUrl,
  error,
  progress = 0,
  state = "idle",
  tone = "employer",
  onFile,
}: VideoUploadDropzoneProps) {
  const isUploading = state === "signing" || state === "uploading";

  return (
    <section className="rounded-2xl border border-[var(--employer-line,rgba(255,255,255,0.12))] bg-[var(--employer-surface,rgba(255,255,255,0.06))] p-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-dashed",
          tone === "candidate" ? "border-white/12 bg-white/[0.04]" : "border-black/15 bg-white/55",
        )}
      >
        {previewUrl ? (
          <video src={previewUrl} controls playsInline className="aspect-video w-full bg-black object-cover" />
        ) : (
          <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center px-6 py-10 text-center">
            <Upload className="h-8 w-8 text-[var(--accent)]" />
            <span className="mt-4 text-lg font-black">{label}</span>
            <span className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted,rgba(255,255,255,0.58))]">
              {description}
            </span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="sr-only"
              onChange={(event) => onFile(event.currentTarget.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      {file ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{file.name}</p>
            <p className="mt-1 text-xs text-[var(--muted,rgba(255,255,255,0.58))]">{formatBytes(file.size)}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-current/15 px-4 text-sm font-bold transition hover:bg-black/5">
              Replace
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="sr-only"
                disabled={isUploading}
                onChange={(event) => onFile(event.currentTarget.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => onFile(null)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/15 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50"
              aria-label="Remove video"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {isUploading ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>{state === "signing" ? "Preparing upload" : "Uploading video"}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {state === "uploaded" ? <p className="mt-3 text-sm font-bold text-[#4f811f]">Video uploaded.</p> : null}
      {error ? <p className="mt-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
    </section>
  );
}
