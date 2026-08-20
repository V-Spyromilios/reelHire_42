export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="flex min-h-40 items-center justify-center text-sm text-current/60">{label}</div>;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/50 p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {body ? <p className="mt-2 text-sm text-[var(--muted)]">{body}</p> : null}
    </div>
  );
}
