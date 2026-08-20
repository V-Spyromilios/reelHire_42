"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BarChart3, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "@/domain/types";
import { useDeleteOpportunity, useEmployerOpportunities } from "@/features/employer/hooks";
import { ApiError } from "@/lib/api/client";

type EmployerOpportunitiesListProps = {
  initialOpportunities: Opportunity[];
};

function deleteErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return "This opportunity no longer exists.";
    if (error.status === 403) return "You don't have permission to delete this opportunity.";
    if (error.status === 409) return "This opportunity already has candidate submissions and cannot be deleted.";
    if (error.status === 502) return "The opportunity could not be deleted because its video could not be removed. Please try again.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "The opportunity could not be deleted. Please try again.";
}

export function EmployerOpportunitiesList({ initialOpportunities }: EmployerOpportunitiesListProps) {
  const { data } = useEmployerOpportunities(initialOpportunities);
  const deleteOpportunity = useDeleteOpportunity();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Opportunity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const opportunities = data ?? [];

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setError(null);
    try {
      await deleteOpportunity.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
      setMenuOpenId(null);
      setNotice("Opportunity deleted.");
      window.setTimeout(() => setNotice(null), 3200);
    } catch (deleteError) {
      setError(deleteErrorMessage(deleteError));
    }
  };

  return (
    <>
      {notice ? (
        <p className="mt-6 inline-flex rounded-full border border-[#d7e8c2] bg-[#eef8e5] px-4 py-2 text-sm font-bold text-[#3f6f17]">
          {notice}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {opportunities.map((opportunity) => (
          <article
            key={opportunity.id}
            className="relative rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <Link
                href={`/employer/opportunities/${opportunity.id}`}
                className="min-w-0 flex-1 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary-focus)]"
              >
                <p className="text-sm font-semibold text-[var(--muted)]">{opportunity.employer.companyName}</p>
                <h2 className="mt-2 text-2xl font-black">{opportunity.roleTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{opportunity.shortDescription}</p>
              </Link>

              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-label={`Open actions for ${opportunity.roleTitle}`}
                  aria-expanded={menuOpenId === opportunity.id}
                  onClick={() => setMenuOpenId((current) => (current === opportunity.id ? null : opportunity.id))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--employer-line)] bg-white/70 text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-focus)]"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {menuOpenId === opportunity.id ? (
                  <div className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-1 shadow-2xl">
                    <Link
                      href={`/employer/opportunities/${opportunity.id}`}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[#f0ece2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-focus)]"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      View
                    </Link>
                    <Link
                      href={`/employer/opportunities/${opportunity.id}/analytics`}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[#f0ece2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-focus)]"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingDelete(opportunity);
                        setError(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-[#a23622] transition hover:bg-[#fff0ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d64a2f]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Opportunity
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {opportunity.skills.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </article>
        ))}

        {!opportunities.length ? (
          <div className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-6 text-center md:col-span-2">
            <h2 className="text-xl font-black">No active opportunities yet</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Create one when the next pitch is ready.</p>
          </div>
        ) : null}
      </div>

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/28 px-4 backdrop-blur-sm" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-opportunity-title"
            className="w-full max-w-md rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5 shadow-2xl"
          >
            <h2 id="delete-opportunity-title" className="text-2xl font-black">
              Delete this opportunity?
            </h2>
            <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
              {pendingDelete.roleTitle} - {pendingDelete.employer.companyName}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This will permanently delete the challenge and its pitch video. This action cannot be undone.
            </p>

            {error ? <p className="mt-4 rounded-xl bg-[#fff0ea] px-3 py-2 text-sm font-semibold text-[#9a2f1b]">{error}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleteOpportunity.isPending}
                onClick={() => {
                  setPendingDelete(null);
                  setError(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--employer-line)] px-5 text-sm font-bold text-[var(--ink)] transition hover:bg-[#f0ece2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-focus)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteOpportunity.isPending}
                onClick={() => void confirmDelete()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#9f2f1f] px-5 text-sm font-bold text-white transition hover:bg-[#842617] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d64a2f] disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deleteOpportunity.isPending ? "Deleting..." : "Delete Opportunity"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
