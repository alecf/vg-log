import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { formatDuration, cn } from "@/lib/utils";

export const Route = createFileRoute("/summary")({
  component: Summary,
});

function Summary() {
  const { isAuthenticated, user } = useAuthStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // For parents, fetch family members to select a child
  const { data: members } = trpc.family.members.useQuery(undefined, {
    enabled: user?.role === "parent",
  });

  const children = members?.filter((m) => m.role === "child") ?? [];

  // Determine which user's data to show
  const targetUserId =
    user?.role === "child"
      ? undefined
      : selectedChildId ?? children[0]?.id;

  const { data: summary, isLoading } = trpc.stats.weekly.useQuery(
    {
      weekOffset,
      userId: targetUserId,
    },
    {
      enabled: user?.role === "child" || !!targetUserId,
    }
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const formatWeekRange = (start: Date, end: Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
  };

  const maxDailyMinutes = summary?.dailyBreakdown
    ? Math.max(...summary.dailyBreakdown.map((d) => d.minutes), 60)
    : 60;

  const selectedChild = children.find((c) => c.id === (selectedChildId ?? children[0]?.id));

  return (
    <div className="space-y-6">
      {/* Child selector for parents */}
      {user?.role === "parent" && children.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition",
                (selectedChildId ?? children[0]?.id) === child.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted"
              )}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      {/* No children message for parents */}
      {user?.role === "parent" && children.length === 0 && (
        <div className="rounded-xl bg-card p-6 text-center">
          <p className="text-muted-foreground">No children in your family yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Share your family code to invite them.
          </p>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="rounded-lg bg-card p-2 hover:bg-muted"
        >
          &larr; Previous
        </button>
        <div className="text-center">
          <h1 className="text-xl font-semibold">
            {selectedChild ? `${selectedChild.name}'s ` : ""}
            {weekOffset === 0
              ? "This Week"
              : weekOffset === -1
              ? "Last Week"
              : `${Math.abs(weekOffset)} weeks ago`}
          </h1>
          {summary && (
            <p className="text-sm text-muted-foreground">
              {formatWeekRange(summary.weekStart, summary.weekEnd)}
            </p>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(Math.min(0, weekOffset + 1))}
          disabled={weekOffset >= 0}
          className="rounded-lg bg-card p-2 hover:bg-muted disabled:opacity-30"
        >
          Next &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-32 rounded-xl bg-card" />
          <div className="h-48 rounded-xl bg-card" />
        </div>
      ) : summary ? (
        <>
          {/* Total summary card */}
          <div className="rounded-xl bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Total time played</p>
            <p
              className={cn(
                "text-5xl font-bold font-mono",
                summary.limitMinutes !== null &&
                  summary.totalMinutes > summary.limitMinutes
                  ? "text-exceeded"
                  : "text-foreground"
              )}
            >
              {formatDuration(summary.totalMinutes)}
            </p>

            {summary.limitMinutes !== null && (
              <>
                <p className="text-muted-foreground mt-2">
                  of {formatDuration(summary.limitMinutes)} limit
                </p>
                <div className="mt-4 h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      summary.totalMinutes > summary.limitMinutes
                        ? "bg-exceeded"
                        : "bg-ok"
                    )}
                    style={{
                      width: `${Math.min(
                        100,
                        (summary.totalMinutes / summary.limitMinutes) * 100
                      )}%`,
                    }}
                  />
                </div>
              </>
            )}

            {/* Comparison */}
            {summary.comparison && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={cn(
                      "text-2xl",
                      summary.comparison.trend === "up" && "text-warning",
                      summary.comparison.trend === "down" && "text-ok",
                      summary.comparison.trend === "same" && "text-muted-foreground"
                    )}
                  >
                    {summary.comparison.trend === "up" && "↑"}
                    {summary.comparison.trend === "down" && "↓"}
                    {summary.comparison.trend === "same" && "→"}
                  </span>
                  <span className="text-muted-foreground">
                    {summary.comparison.trend === "same"
                      ? "Same as last week"
                      : `${Math.abs(summary.comparison.changePercent)}% ${summary.comparison.trend === "up" ? "more" : "less"} than last week`}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Last week: {formatDuration(summary.comparison.lastWeekMinutes)}
                </p>
              </div>
            )}
          </div>

          {/* Daily breakdown */}
          <div className="rounded-xl bg-card p-4">
            <h2 className="font-semibold mb-4">Daily Breakdown</h2>
            <div className="space-y-3">
              {summary.dailyBreakdown.map((day, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-10 text-sm text-muted-foreground">
                    {dayNames[index]}
                  </span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        day.minutes === 0
                          ? "bg-muted"
                          : day.minutes > 120
                          ? "bg-warning"
                          : "bg-primary"
                      )}
                      style={{
                        width: `${(day.minutes / maxDailyMinutes) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono text-sm">
                    {day.minutes > 0 ? formatDuration(day.minutes) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sessions list */}
          <div className="rounded-xl bg-card p-4">
            <h2 className="font-semibold mb-4">
              Sessions ({summary.sessions.length})
            </h2>
            {summary.sessions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {summary.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div>
                      <p className="text-sm">
                        {new Date(session.startTime).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.startTime).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {session.endTime &&
                          ` - ${new Date(session.endTime).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium">
                        {formatDuration(session.durationMinutes)}
                      </p>
                      {session.isManual && (
                        <p className="text-xs text-muted-foreground">Manual</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sessions this week</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground">No data available</p>
      )}
    </div>
  );
}
