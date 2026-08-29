import { Skeleton } from "@/components/ui";

/**
 * Shaped like the dashboard it replaces — a hero, a primary action, two
 * cards — so nothing jumps when the real thing arrives. A centred spinner
 * would tell the reader less and move more.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:py-10">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-13 w-48 rounded-ctl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
      <span className="sr-only">Loading your claim</span>
    </div>
  );
}
