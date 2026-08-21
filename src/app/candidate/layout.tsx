import { CandidateNav } from "@/components/layout/candidate-nav";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="candidate-theme min-h-dvh text-[var(--candidate-text)]">
      {children}
      <CandidateNav />
    </div>
  );
}
