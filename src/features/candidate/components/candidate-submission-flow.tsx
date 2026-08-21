"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Github, Rocket, Video } from "lucide-react";
import { useCreateSubmission } from "@/features/candidate/hooks";
import { VideoUploadDropzone } from "@/features/media/components/video-upload-dropzone";
import { useVideoFile } from "@/features/media/hooks/use-video-file";
import { uploadVideoToCloudinary, type UploadState } from "@/features/media/services/cloudinary-upload-service";
import { githubRepositoryUrlSchema } from "@/features/media/services/media-validation";
import { ApiError } from "@/lib/api/client";

type CandidateSubmissionFlowProps = {
  opportunityId: string;
};

export function CandidateSubmissionFlow({ opportunityId }: CandidateSubmissionFlowProps) {
  const router = useRouter();
  const video = useVideoFile();
  const createSubmission = useCreateSubmission();
  const [githubUrl, setGithubUrl] = useState("");
  const [step, setStep] = useState(1);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validGithub = githubRepositoryUrlSchema.safeParse(githubUrl).success;
  const canReview = validGithub && Boolean(video.file);

  const submit = async () => {
    setError(null);
    const parsedGithub = githubRepositoryUrlSchema.safeParse(githubUrl);
    if (!parsedGithub.success) {
      setError("Enter a valid public GitHub repository URL.");
      setStep(1);
      return;
    }
    if (!video.file) {
      setError("Add an explanation video before submitting.");
      setStep(2);
      return;
    }

    try {
      setUploadState("signing");
      setProgress(0);
      const explanationVideo = await uploadVideoToCloudinary(video.file, "candidate_explanation", (nextProgress) => {
        setUploadState("uploading");
        setProgress(nextProgress);
      });
      setUploadState("uploaded");
      try {
        await createSubmission.mutateAsync({
          opportunityId,
          githubUrl: parsedGithub.data,
          explanationVideoUrl: explanationVideo.secureUrl,
          explanationVideo,
        });
      } catch (error) {
        console.error("[ReelHire submission] Persistence failed after video upload", { error });
        if (error instanceof ApiError) {
          throw new Error(`Video uploaded, but the submission could not be saved. ${error.message}`);
        }
        throw new Error("Video uploaded, but the submission could not be saved.");
      }
      router.push("/candidate/challenges");
    } catch (submissionError) {
      setUploadState("error");
      setError(submissionError instanceof Error ? submissionError.message : "Could not submit your solution.");
    }
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] px-5 pb-28 pt-8">
      <Link href="/candidate/challenges" className="inline-flex items-center gap-2 text-sm font-bold text-[#f5f1e8]/58">
        <ArrowLeft className="h-4 w-4" />
        Challenges
      </Link>
      <p className="mt-6 text-sm font-semibold text-[var(--accent)]">Submission</p>
      <h1 className="mt-2 text-3xl font-black">Show your build</h1>
      <p className="mt-3 text-sm leading-6 text-[#f5f1e8]/62">
        Repository must be public during evaluation. Your explanation video can be up to 3 minutes.
      </p>

      <div className="mt-7 flex rounded-full border border-[#f5f1e8]/10 bg-[#f5f1e8]/[0.05] p-1">
        {[
          { id: 1, label: "Repo", icon: Github },
          { id: 2, label: "Video", icon: Video },
          { id: 3, label: "Review", icon: ClipboardCheck },
        ].map((item) => {
          const Icon = item.icon;
          const active = step === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id)}
              className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-xs font-bold transition ${
                active ? "bg-[rgba(var(--candidate-info-rgb),0.22)] text-[#f5f1e8]" : "text-[#f5f1e8]/48 hover:text-[#f5f1e8]"
              }`}
            >
              <Icon className="h-4 w-4 text-[var(--candidate-info)]" />
              {item.label}
            </button>
          );
        })}
      </div>

      <section className="mt-5 rounded-[24px] border border-[var(--candidate-line)] bg-[var(--candidate-surface)]/84 p-4 shadow-[0_18px_54px_rgba(0,0,0,0.14)]">
        {step === 1 ? (
          <div>
            <h2 className="text-xl font-black">GitHub repository</h2>
            <label className="mt-4 block">
              <span className="text-sm font-bold text-[#f5f1e8]/72">Public repository URL</span>
              <input
                value={githubUrl}
                onChange={(event) => setGithubUrl(event.target.value)}
                placeholder="https://github.com/you/project"
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--candidate-line)] bg-[var(--candidate-surface-2)]/62 px-4 text-sm outline-none transition placeholder:text-[#f5f1e8]/28 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </label>
            {githubUrl && validGithub ? (
              <div className="mt-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-4">
                <p className="text-sm font-black text-[#f5f1e8]">Repository ready</p>
                <p className="mt-1 break-all text-sm text-[#f5f1e8]/62">{githubUrl}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <VideoUploadDropzone
            tone="candidate"
            label="Upload explanation video"
            description="Walk through what you built, why this approach, trade-offs, and what you would improve."
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
        ) : null}

        {step === 3 ? (
          <div>
            <h2 className="text-xl font-black">Review & submit</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-[var(--candidate-surface-2)]/62 p-4">
                <p className="font-bold text-[#f5f1e8]/52">Repository</p>
                <p className="mt-1 break-all text-[#f5f1e8]">{githubUrl || "Missing repository"}</p>
              </div>
              <div className="rounded-2xl bg-[var(--candidate-surface-2)]/62 p-4">
                <p className="font-bold text-[#f5f1e8]/52">Explanation video</p>
                <p className="mt-1 text-[#f5f1e8]">{video.file ? video.file.name : "Missing video"}</p>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-2xl bg-[#ff6a4d]/12 p-3 text-sm font-semibold text-[#ffb09f]">{error}</p> : null}

        <div className="mt-5 flex gap-3">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((current) => current - 1)} className="h-12 rounded-full border border-[#f5f1e8]/12 px-5 text-sm font-bold text-[#f5f1e8]/72">
              Back
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((current) => current + 1)}
              disabled={(step === 1 && !validGithub) || (step === 2 && !video.file)}
              className="h-12 flex-1 rounded-full bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-ink)] transition hover:bg-[var(--accent-strong)] disabled:opacity-45"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canReview || createSubmission.isPending || uploadState === "signing" || uploadState === "uploading"}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-ink)] transition hover:bg-[var(--accent-strong)] disabled:opacity-45"
            >
              <Rocket className="h-4 w-4" />
              {createSubmission.isPending ? "Submitting..." : "Submit solution"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
