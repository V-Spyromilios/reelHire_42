import Link from "next/link";

export default async function CandidateChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto min-h-dvh max-w-[430px] px-5 pb-28 pt-8">
      <p className="text-sm font-semibold text-[var(--candidate-info)]">Challenge brief</p>
      <h1 className="mt-2 text-3xl font-black">Project workspace</h1>
      <p className="mt-3 text-sm leading-6 text-[#f5f1e8]/62">
        This route is reserved for the full challenge workspace. The service layer already supports loading opportunity
        detail for {id}.
      </p>
      <Link
        href={`/candidate/submit/${id}`}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
      >
        Submit Solution
      </Link>
    </main>
  );
}
