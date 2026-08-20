import { Sparkles } from "lucide-react";

export default function CandidateMatchesPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[430px] px-5 pb-28 pt-8">
      <Sparkles className="h-8 w-8 text-[var(--accent)]" />
      <h1 className="mt-4 text-3xl font-black">Matches</h1>
      <p className="mt-3 text-sm leading-6 text-white/62">
        Mutual hiring matches will appear here after an employer accepts a submitted challenge.
      </p>
    </main>
  );
}
