import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role === "parent") {
    return <ParentDashboard />;
  }

  return <ChildDashboard />;
}

function ChildDashboard() {
  const { data: remaining, isLoading } = trpc.limit.remaining.useQuery({});
  const { data: overview } = trpc.stats.overview.useQuery({});

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const remainingMinutes = remaining?.weekly.remaining ?? null;
  const limitMinutes = remaining?.weekly.limit ?? null;
  const usedMinutes = remaining?.weekly.used ?? 0;

  return (
    <div className="space-y-6">
      {/* Remaining time hero */}
      <div className="rounded-xl bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">Time remaining this week</p>
        <p
          className={cn(
            "text-5xl font-bold font-mono",
            remaining?.alertState === "ok" && "text-ok",
            remaining?.alertState === "warning" && "text-warning",
            remaining?.alertState === "urgent" && "text-urgent",
            remaining?.alertState === "exceeded" && "text-exceeded"
          )}
        >
          {remainingMinutes !== null ? formatDuration(remainingMinutes) : "No limit set"}
        </p>
        {limitMinutes !== null && (
          <p className="text-sm text-muted-foreground mt-2">
            {formatDuration(usedMinutes)} used of {formatDuration(limitMinutes)}
          </p>
        )}

        {/* Progress bar */}
        {limitMinutes !== null && (
          <div className="mt-4 h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                remaining?.alertState === "ok" && "bg-ok",
                remaining?.alertState === "warning" && "bg-warning",
                remaining?.alertState === "urgent" && "bg-urgent",
                remaining?.alertState === "exceeded" && "bg-exceeded"
              )}
              style={{
                width: `${Math.min(100, (usedMinutes / limitMinutes) * 100)}%`,
              }}
            />
          </div>
        )}

        {/* Over limit warning */}
        {remaining?.isOverLimit && (
          <div className="mt-4 rounded-lg bg-exceeded/20 p-3 text-exceeded">
            <p className="font-medium">You are over your limit!</p>
            <p className="text-sm opacity-75">Your parents have been notified.</p>
          </div>
        )}
      </div>

      {/* Active session indicator */}
      {remaining?.activeSession && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
          <p className="text-sm text-muted-foreground">Currently playing</p>
          <p className="text-2xl font-bold text-primary font-mono">
            {formatDuration(remaining.activeSession.elapsedMinutes)}
          </p>
        </div>
      )}

      {/* Recent sessions */}
      <div className="rounded-xl bg-card p-4">
        <h2 className="font-semibold mb-4">Recent Sessions</h2>
        {overview?.recentSessions && overview.recentSessions.length > 0 ? (
          <div className="space-y-2">
            {overview.recentSessions.map((session) => (
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
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-medium">
                    {formatDuration(session.durationMinutes)}
                  </p>
                  {session.isActive && (
                    <p className="text-xs text-primary">Active</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No sessions this week</p>
        )}
      </div>
    </div>
  );
}

function ParentDashboard() {
  const { data: familyOverview, isLoading } = trpc.stats.familyOverview.useQuery();
  const { data: notifications } = trpc.notification.list.useQuery({ unreadOnly: true, limit: 5 });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Family Dashboard</h1>

      {/* Notifications */}
      {notifications && notifications.length > 0 && (
        <div className="rounded-xl bg-exceeded/10 border border-exceeded/20 p-4">
          <h2 className="font-semibold text-exceeded mb-2">Notifications</h2>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div key={notif.id} className="text-sm">
                <p>{notif.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Children overview */}
      <div className="grid gap-4">
        {familyOverview?.children.map((child) => (
          <div
            key={child.id}
            className={cn(
              "rounded-xl bg-card p-4 border",
              child.isOverLimit ? "border-exceeded/50" : "border-transparent"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">{child.name}</h3>
              {child.hasActiveSession && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                  Playing now
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-3xl font-bold font-mono",
                  child.isOverLimit ? "text-exceeded" : "text-foreground"
                )}
              >
                {formatDuration(child.weeklyMinutes)}
              </span>
              {child.weeklyLimitMinutes !== null && (
                <span className="text-muted-foreground">
                  / {formatDuration(child.weeklyLimitMinutes)}
                </span>
              )}
            </div>

            {child.weeklyLimitMinutes !== null && (
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    child.isOverLimit ? "bg-exceeded" : "bg-ok"
                  )}
                  style={{
                    width: `${Math.min(
                      100,
                      (child.weeklyMinutes / child.weeklyLimitMinutes) * 100
                    )}%`,
                  }}
                />
              </div>
            )}

            {child.isOverLimit && (
              <p className="text-sm text-exceeded mt-2">Over limit!</p>
            )}
          </div>
        ))}

        {(!familyOverview?.children || familyOverview.children.length === 0) && (
          <div className="rounded-xl bg-card p-6 text-center">
            <p className="text-muted-foreground">No children in your family yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Share your family code to invite them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-xl bg-card p-6 h-48" />
      <div className="rounded-xl bg-card p-4 h-32" />
    </div>
  );
}
