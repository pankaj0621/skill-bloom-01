import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** Full-page skeleton for dashboard-like pages */
export const DashboardSkeleton = memo(() => (
  <div className="space-y-6">
    <div>
      <Skeleton className="h-9 w-72 mb-2" />
      <Skeleton className="h-5 w-56" />
    </div>
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
          <CardContent><Skeleton className="h-7 w-16 mb-2" /><Skeleton className="h-4 w-full" /></CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
      ))}
    </div>
  </div>
));
DashboardSkeleton.displayName = "DashboardSkeleton";

/** List skeleton for community/leaderboard pages */
export const ListSkeleton = memo(({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    ))}
  </div>
));
ListSkeleton.displayName = "ListSkeleton";

/** Card skeleton for profile/settings */
export const CardSkeleton = memo(({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    ))}
  </div>
));
CardSkeleton.displayName = "CardSkeleton";

/** Chart skeleton */
export const ChartSkeleton = memo(() => (
  <Card>
    <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
    <CardContent>
      <div className="h-48 flex items-end justify-between gap-2 px-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
));
ChartSkeleton.displayName = "ChartSkeleton";
