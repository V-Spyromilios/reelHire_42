"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardList, Rocket, Upload } from "lucide-react";
import { z } from "zod";
import { useCreateOpportunity } from "@/features/employer/hooks";
import { VideoUploadDropzone } from "@/features/media/components/video-upload-dropzone";
import { useVideoFile } from "@/features/media/hooks/use-video-file";
import { uploadVideoToCloudinary, type UploadState } from "@/features/media/services/cloudinary-upload-service";
import { ApiError } from "@/lib/api/client";

const opportunityFormSchema = z.object({
  roleTitle: z.string().min(3, "Role title is required."),
  shortDescription: z.string().min(12, "Add a concise pitch candidates can understand quickly."),
  challengeTitle: z.string().min(4, "Challenge title is required."),
  challengeDescription: z.string().min(24, "Describe the actual project candidates should build."),
  skills: z.string().min(2, "Add at least one relevant skill."),
  location: z.string().min(2, "Location is required."),
  workMode: z.enum(["remote", "hybrid", "onsite"]),
  expectedChallengeDuration: z.string().min(2, "Expected challenge time is required."),
  deadline: z.string().optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

const defaultValues: OpportunityFormValues = {
  roleTitle: "Backend Engineer",
  shortDescription: "Build the service layer for real-time freight exception handling.",
  challengeTitle: "Design an incident-aware job queue",
  challengeDescription:
    "Create a small queue service that prioritizes delayed shipments, exposes a REST API, and explains retry behavior under partial failure.",
  skills: "Go, Postgres, Queues, System Design",
  location: "Berlin",
  workMode: "hybrid",
  expectedChallengeDuration: "4-6 hours",
  deadline: "",
};

export function NewOpportunityForm() {
  const router = useRouter();
  const video = useVideoFile();
  const createOpportunity = useCreateOpportunity();
  const [values, setValues] = useState(defaultValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);

  const stepState = useMemo(
    () => [
      { title: "Record", icon: Upload, done: Boolean(video.file) },
      { title: "Challenge", icon: ClipboardList, done: values.roleTitle.length > 2 && values.challengeDescription.length > 23 },
      { title: "Publish", icon: Rocket, done: uploadState === "uploaded" || createOpportunity.isSuccess },
    ],
    [createOpportunity.isSuccess, uploadState, values.challengeDescription.length, values.roleTitle.length, video.file],
  );

  const updateValue = <Key extends keyof OpportunityFormValues>(key: Key, value: OpportunityFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const publish = async () => {
    setFormError(null);
    const parsed = opportunityFormSchema.safeParse(values);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the opportunity details.");
      return;
    }
    if (!video.file) {
      setFormError("Add a pitch video before publishing.");
      return;
    }

    try {
      setUploadState("signing");
      setProgress(0);
      const pitchVideo = await uploadVideoToCloudinary(video.file, "opportunity_pitch", (nextProgress) => {
        setUploadState("uploading");
        setProgress(nextProgress);
      });
      setUploadState("uploaded");

      let opportunity;
      try {
        opportunity = await createOpportunity.mutateAsync({
          ...parsed.data,
          videoUrl: pitchVideo.secureUrl,
          pitchVideo,
          deadline: parsed.data.deadline ? new Date(parsed.data.deadline).toISOString() : undefined,
          skills: parsed.data.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
        });
      } catch (error) {
        console.error("[ReelHire opportunity] Persistence failed after video upload", { error });
        if (error instanceof ApiError) {
          throw new Error(`Video uploaded, but the opportunity could not be saved. ${error.message}`);
        }
        throw new Error("Video uploaded, but the opportunity could not be saved.");
      }

      router.push(`/employer/opportunities/${opportunity.id}`);
    } catch (error) {
      setUploadState("error");
      setFormError(error instanceof Error ? error.message : "Could not publish the opportunity.");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 lg:px-10">
      <p className="text-sm font-semibold text-[var(--muted)]">Create opportunity</p>
      <h1 className="mt-2 text-4xl font-black">A lightweight pitch, not an HR form</h1>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {stepState.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-[#5f8f23]" />
                {step.done ? <Check className="h-5 w-5 text-[#5f8f23]" /> : <span className="text-xs font-bold text-[var(--muted)]">Step {index + 1}</span>}
              </div>
              <p className="mt-4 text-lg font-black">{step.title}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <VideoUploadDropzone
          label="Upload pitch video"
          description="Use a browser-compatible video. Recommended length: 30-90 seconds. Maximum size: 100 MB."
          file={video.file}
          previewUrl={video.previewUrl}
          error={video.error}
          progress={progress}
          state={uploadState}
          onFile={(file) => {
            video.selectFile(file);
            setUploadState(file ? "selected" : "idle");
            setProgress(0);
          }}
        />

        <section className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-bold">Role title</span>
              <input value={values.roleTitle} onChange={(event) => updateValue("roleTitle", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--employer-line)] bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-[#6f9f2f]" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-bold">Short pitch</span>
              <textarea value={values.shortDescription} onChange={(event) => updateValue("shortDescription", event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-[var(--employer-line)] bg-white p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#6f9f2f]" />
            </label>
            <label>
              <span className="text-sm font-bold">Location</span>
              <input value={values.location} onChange={(event) => updateValue("location", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--employer-line)] bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-[#6f9f2f]" />
            </label>
            <label>
              <span className="text-sm font-bold">Work mode</span>
              <select value={values.workMode} onChange={(event) => updateValue("workMode", event.target.value as OpportunityFormValues["workMode"])} className="mt-2 h-11 w-full rounded-xl border border-[var(--employer-line)] bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-[#6f9f2f]">
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-bold">Challenge title</span>
              <input value={values.challengeTitle} onChange={(event) => updateValue("challengeTitle", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--employer-line)] bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-[#6f9f2f]" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-bold">Challenge description</span>
              <textarea value={values.challengeDescription} onChange={(event) => updateValue("challengeDescription", event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-[var(--employer-line)] bg-white p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#6f9f2f]" />
            </label>
            <label>
              <span className="text-sm font-bold">Expected time</span>
              <input value={values.expectedChallengeDuration} onChange={(event) => updateValue("expectedChallengeDuration", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--employer-line)] bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-[#6f9f2f]" />
            </label>
            <label>
              <span className="text-sm font-bold">Deadline</span>
              <input type="date" value={values.deadline} onChange={(event) => updateValue("deadline", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--employer-line)] bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-[#6f9f2f]" />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-bold">Relevant skills</span>
              <input value={values.skills} onChange={(event) => updateValue("skills", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--employer-line)] bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-[#6f9f2f]" />
            </label>
          </div>

          {formError ? <p className="mt-4 rounded-xl bg-[#fff0ea] px-3 py-2 text-sm font-semibold text-[#9a2f1b]">{formError}</p> : null}

          <button
            type="button"
            onClick={() => void publish()}
            disabled={createOpportunity.isPending || uploadState === "signing" || uploadState === "uploading"}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-focus)] disabled:opacity-60"
          >
            <Rocket className="h-4 w-4 text-[var(--accent)]" />
            {createOpportunity.isPending ? "Publishing..." : "Publish opportunity"}
          </button>
        </section>
      </div>
    </main>
  );
}
