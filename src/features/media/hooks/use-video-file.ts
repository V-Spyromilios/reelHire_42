"use client";

import { useEffect, useMemo, useState } from "react";
import { validateVideoFile } from "@/features/media/services/media-validation";

export function useVideoFile() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectFile = (nextFile: File | null) => {
    if (!nextFile) {
      setFile(null);
      setError(null);
      return;
    }

    const validationError = validateVideoFile(nextFile);
    setFile(validationError ? null : nextFile);
    setError(validationError);
  };

  return {
    file,
    previewUrl,
    error,
    selectFile,
    clearFile: () => selectFile(null),
  };
}
