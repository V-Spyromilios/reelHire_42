import { EmployerSidebar } from "@/components/layout/employer-sidebar";

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="employer-theme employer-grid min-h-dvh bg-[var(--employer-bg)] text-[var(--ink)]">
      <EmployerSidebar />
      <div className="lg:pl-72">{children}</div>
    </div>
  );
}
