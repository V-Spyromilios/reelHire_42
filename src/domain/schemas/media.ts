import { z } from "zod";

export const uploadPurposeSchema = z.enum(["opportunity_pitch", "candidate_explanation"]);

export const mediaAssetSchema = z.object({
  publicId: z.string().min(1),
  secureUrl: z.string().url(),
  resourceType: z.literal("video"),
  format: z.string().min(1),
  bytes: z.number().int().positive(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  durationSeconds: z.number().positive().nullable().optional(),
  createdAt: z.string().optional(),
});

export const signedUploadSchema = z
  .object({
    cloud_name: z.string().min(1),
    api_key: z.string().min(1),
    timestamp: z.number().int().positive(),
    signature: z.string().min(1),
    folder: z.string().min(1),
    public_id: z.string().min(1),
    resource_type: z.literal("video"),
  })
  .transform((upload) => ({
    cloudName: upload.cloud_name,
    apiKey: upload.api_key,
    timestamp: upload.timestamp,
    signature: upload.signature,
    folder: upload.folder,
    publicId: upload.public_id,
    resourceType: upload.resource_type,
  }));

export const cloudinaryUploadResponseSchema = z.object({
  public_id: z.string().min(1),
  secure_url: z.string().url(),
  resource_type: z.literal("video"),
  format: z.string().min(1),
  bytes: z.number().int().positive(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration: z.number().positive().nullable().optional(),
  created_at: z.string().optional(),
});

export type UploadPurpose = z.infer<typeof uploadPurposeSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type SignedUpload = z.infer<typeof signedUploadSchema>;
export type CloudinaryUploadResponse = z.infer<typeof cloudinaryUploadResponseSchema>;
