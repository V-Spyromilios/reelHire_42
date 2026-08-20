import { CandidateNav } from "@/components/layout/candidate-nav";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--candidate-bg)] text-white">
      {children}
      <CandidateNav />
    </div>
  );
}
