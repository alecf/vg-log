import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { formatDuration, cn, alertStateClasses } from "@/lib/utils";
import { Card, ProgressBar } from "@/components";

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
      <Card padding="lg" className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Time remaining this week</p>
        <p
          className={cn(
            "text-5xl font-bold font-mono",
            alertStateClasses(remaining?.alertState, "text")
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
          <div className="mt-4">
            <ProgressBar
              value={usedMinutes}
              max={limitMinutes}
              alertState={remaining?.alertState}
              size="md"
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
      </Card>

      {/* Active session indicator */}
      {remaining?.activeSession && (
        <Card className="bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground">Currently playing</p>
          <p className="text-2xl font-bold text-primary font-mono">
            {formatDuration(remaining.activeSession.elapsedMinutes)}
          </p>
        </Card>
      )}

      {/* Recent sessions */}
      <Card>
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
      </Card>
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
        <Card variant="alert">
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
        </Card>
      )}

      {/* Children overview */}
      <div className="grid gap-4">
        {familyOverview?.children.map((child) => (
          <Card
            key={child.id}
            className={cn(
              "border",
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
              <ProgressBar
                value={child.weeklyMinutes}
                max={child.weeklyLimitMinutes}
                alertState={child.isOverLimit ? "exceeded" : "ok"}
                className="mt-2"
              />
            )}

            {child.isOverLimit && (
              <p className="text-sm text-exceeded mt-2">Over limit!</p>
            )}
          </Card>
        ))}

        {(!familyOverview?.children || familyOverview.children.length === 0) && (
          <Card padding="lg" className="text-center">
            <p className="text-muted-foreground">No children in your family yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Share your family code to invite them.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card padding="lg" className="h-48" />
      <Card className="h-32" />
    </div>
  );
}
