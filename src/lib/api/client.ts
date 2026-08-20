import { z } from "zod";

const defaultApiBaseUrl = "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl() {
  if (typeof window === "undefined" && process.env.API_INTERNAL_BASE_URL) {
    return process.env.API_INTERNAL_BASE_URL;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl;
}

export function joinApiUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

if (process.env.NODE_ENV === "development") {
  console.info("[ReelHire API]", {
    dataSource: process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock",
    apiBaseUrl: getApiBaseUrl(),
  });
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  init?: RequestInit,
): Promise<T> {
  const url = joinApiUrl(getApiBaseUrl(), path);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error("[ReelHire API] Network failure", { url, error });
    throw new ApiError(
      `Could not reach ReelHire backend. Check that FastAPI is running at ${getApiBaseUrl()}.`,
      0,
      url,
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: unknown; message?: unknown };
      if (typeof body.detail === "string") message = body.detail;
      if (typeof body.message === "string") message = body.message;
    } catch {
      // Keep the generic API message when the response is not JSON.
    }
    console.error("[ReelHire API] HTTP failure", { url, status: response.status, message });
    throw new ApiError(message, response.status, url);
  }

  if (response.status === 204) {
    return schema.parse(undefined);
  }

  const data = await response.json();
  return schema.parse(data);
}
