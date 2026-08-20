import {
  cloudinaryUploadResponseSchema,
  mediaAssetSchema,
  signedUploadSchema,
  type MediaAsset,
  type UploadPurpose,
} from "@/domain/schemas/media";
import { apiRequest } from "@/lib/api/client";
import { validateVideoFile } from "./media-validation";

export type UploadState = "idle" | "selected" | "signing" | "uploading" | "uploaded" | "error";

export type UploadProgressCallback = (progress: number) => void;

export type UploadStage = "validation" | "signing" | "cloudinary_upload";

export class MediaUploadError extends Error {
  constructor(
    message: string,
    readonly stage: UploadStage,
    readonly status?: number,
  ) {
    super(message);
    this.name = "MediaUploadError";
  }
}

function sanitizedCloudinaryError(value: string | null) {
  if (!value) return null;
  return value.replace(/Invalid Signature\s+[a-f0-9]{32,64}/gi, "Invalid Signature [redacted]");
}

function cloudinaryErrorReason(responseText: string, responseHeader: string | null) {
  const headerReason = sanitizedCloudinaryError(responseHeader);
  if (headerReason) return headerReason;

  try {
    const payload = JSON.parse(responseText) as { error?: { message?: unknown } };
    if (typeof payload.error?.message === "string") {
      return sanitizedCloudinaryError(payload.error.message);
    }
  } catch {
    // Cloudinary usually returns JSON, but keep diagnostics optional.
  }

  return null;
}

export async function signVideoUpload(purpose: UploadPurpose) {
  return apiRequest("/api/media/sign-upload", signedUploadSchema, {
    method: "POST",
    body: JSON.stringify({ purpose }),
  });
}

export function uploadVideoToCloudinary(
  file: File,
  purpose: UploadPurpose,
  onProgress?: UploadProgressCallback,
): Promise<MediaAsset> {
  const validationError = validateVideoFile(file);
  if (validationError) {
    return Promise.reject(new MediaUploadError(validationError, "validation"));
  }

  return new Promise((resolve, reject) => {
    void signVideoUpload(purpose)
      .then((signedUpload) => {
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", signedUpload.apiKey);
        form.append("timestamp", String(signedUpload.timestamp));
        form.append("signature", signedUpload.signature);
        form.append("folder", signedUpload.folder);
        form.append("public_id", signedUpload.publicId);

        const xhr = new XMLHttpRequest();
        const endpoint = `https://api.cloudinary.com/v1_1/${signedUpload.cloudName}/${signedUpload.resourceType}/upload`;
        xhr.open("POST", endpoint);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onerror = () => reject(new MediaUploadError("Video upload failed. Check your connection and try again.", "cloudinary_upload"));
        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            const cloudinaryReason = cloudinaryErrorReason(xhr.responseText, xhr.getResponseHeader("X-Cld-Error"));
            console.error("[ReelHire upload] Cloudinary rejected upload", {
              status: xhr.status,
              reason: cloudinaryReason,
            });
            const message =
              xhr.status === 401
                ? "Video authentication failed. Please retry or contact the ReelHire team."
                : `Video upload failed. Cloudinary returned HTTP ${xhr.status}.`;
            reject(new MediaUploadError(message, "cloudinary_upload", xhr.status));
            return;
          }

          try {
            const cloudinary = cloudinaryUploadResponseSchema.parse(JSON.parse(xhr.responseText));
            const mediaAsset = mediaAssetSchema.parse({
              publicId: cloudinary.public_id,
              secureUrl: cloudinary.secure_url,
              resourceType: cloudinary.resource_type,
              format: cloudinary.format,
              bytes: cloudinary.bytes,
              width: cloudinary.width,
              height: cloudinary.height,
              durationSeconds: cloudinary.duration,
              createdAt: cloudinary.created_at,
            });
            onProgress?.(100);
            resolve(mediaAsset);
          } catch {
            reject(new MediaUploadError("Video upload failed. Cloudinary returned malformed media metadata.", "cloudinary_upload"));
          }
        };

        xhr.send(form);
      })
      .catch((error: unknown) => {
        if (error instanceof MediaUploadError) {
          reject(error);
          return;
        }
        const message = error instanceof Error ? error.message : "Could not prepare video upload.";
        reject(new MediaUploadError(`Could not prepare video upload. ${message}`, "signing"));
      });
  });
}
