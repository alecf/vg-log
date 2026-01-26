import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import { useTimerStore } from "@/stores/timer";
import { trpc } from "@/lib/trpc";
import { formatTime, formatDuration, cn } from "@/lib/utils";

export const Route = createFileRoute("/play")({
  component: Play,
});

function Play() {
  const { isAuthenticated, user } = useAuthStore();
  const {
    activeSession,
    elapsedSeconds,
    remainingSeconds,
    alertState,
    parentNotified,
    setActiveSession,
    setWeeklyData,
    setParentNotified,
    tick,
  } = useTimerStore();

  const utils = trpc.useUtils();

  // Fetch remaining time data
  const { data: remaining } = trpc.limit.remaining.useQuery(
    {},
    {
      refetchInterval: activeSession ? 30000 : 60000, // More frequent when playing
    }
  );

  // Fetch active session on mount
  const { data: activeSessionData } = trpc.session.active.useQuery();

  // Start session mutation
  const startSession = trpc.session.start.useMutation({
    onSuccess: (data) => {
      setActiveSession({
        id: data.sessionId,
        startTime: data.startTime,
      });
      if (data.parentNotified) {
        setParentNotified(true);
      }
      utils.limit.remaining.invalidate();
    },
  });

  // Stop session mutation
  const stopSession = trpc.session.stop.useMutation({
    onSuccess: (data) => {
      setActiveSession(null);
      if (data.parentNotified) {
        setParentNotified(true);
      }
      utils.limit.remaining.invalidate();
      utils.stats.overview.invalidate();
    },
  });

  // Sync active session from server
  useEffect(() => {
    if (activeSessionData) {
      setActiveSession({
        id: activeSessionData.id,
        startTime: activeSessionData.startTime,
      });
    } else if (activeSessionData === null && activeSession) {
      setActiveSession(null);
    }
  }, [activeSessionData]);

  // Sync weekly data
  useEffect(() => {
    if (remaining) {
      setWeeklyData(remaining.weekly.used, remaining.weekly.limit);
      if (remaining.isOverLimit) {
        setParentNotified(true);
      }
    }
  }, [remaining]);

  // Timer tick effect
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      tickRef.current();
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Audio alert effect
  useEffect(() => {
    if (alertState === "urgent" || alertState === "exceeded") {
      // Play alert sound (would need actual audio file)
      // const audio = new Audio('/sounds/alert.mp3');
      // audio.play().catch(() => {});
    }
  }, [alertState]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== "child") {
    return <Navigate to="/" />;
  }

  const weeklyLimitMinutes = remaining?.weekly.limit ?? null;
  const weeklyUsedMinutes = remaining?.weekly.used ?? 0;
  const isOverLimit = remaining?.isOverLimit ?? false;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* Remaining time display */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">
          {activeSession ? "Time remaining" : "You have"}
        </p>
        <p
          className={cn(
            "text-6xl font-bold font-mono transition-colors",
            alertState === "ok" && "text-ok",
            alertState === "warning" && "text-warning",
            alertState === "urgent" && "text-urgent animate-pulse",
            alertState === "exceeded" && "text-exceeded animate-pulse"
          )}
        >
          {remainingSeconds !== null
            ? formatTime(remainingSeconds)
            : weeklyLimitMinutes !== null
            ? formatDuration(weeklyLimitMinutes - weeklyUsedMinutes)
            : "No limit"}
        </p>
        {weeklyLimitMinutes !== null && !activeSession && (
          <p className="text-sm text-muted-foreground mt-1">this week</p>
        )}
      </div>

      {/* Parent notified indicator */}
      {parentNotified && (
        <div className="rounded-lg bg-exceeded/20 border border-exceeded/30 px-4 py-2 text-exceeded text-sm">
          Your parents have been notified
        </div>
      )}

      {/* Timer display when active */}
      {activeSession && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Playing for</p>
          <p className="text-4xl font-mono text-primary">{formatTime(elapsedSeconds)}</p>
        </div>
      )}

      {/* Main action button */}
      {activeSession ? (
        <button
          onClick={() =>
            stopSession.mutate({ sessionId: activeSession.id })
          }
          disabled={stopSession.isPending}
          className={cn(
            "w-48 h-48 rounded-full text-2xl font-bold transition-all",
            "bg-card border-4",
            alertState === "ok" && "border-ok hover:bg-ok/10",
            alertState === "warning" && "border-warning hover:bg-warning/10",
            alertState === "urgent" && "border-urgent hover:bg-urgent/10 animate-pulse",
            alertState === "exceeded" && "border-exceeded hover:bg-exceeded/10 animate-pulse",
            "disabled:opacity-50"
          )}
        >
          {stopSession.isPending ? "Stopping..." : "Stop Playing"}
        </button>
      ) : (
        <button
          onClick={() => startSession.mutate({})}
          disabled={startSession.isPending}
          className={cn(
            "w-48 h-48 rounded-full text-2xl font-bold transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50",
            isOverLimit && "bg-exceeded hover:bg-exceeded/90"
          )}
        >
          {startSession.isPending ? "Starting..." : "Start Playing"}
        </button>
      )}

      {/* Over limit warning */}
      {isOverLimit && !activeSession && (
        <div className="max-w-xs text-center">
          <p className="text-exceeded font-medium">You're over your limit</p>
          <p className="text-sm text-muted-foreground mt-1">
            You can still play, but your parents will be notified.
          </p>
        </div>
      )}

      {/* Progress bar */}
      {weeklyLimitMinutes !== null && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{formatDuration(weeklyUsedMinutes + (activeSession ? Math.floor(elapsedSeconds / 60) : 0))} used</span>
            <span>{formatDuration(weeklyLimitMinutes)} limit</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000",
                alertState === "ok" && "bg-ok",
                alertState === "warning" && "bg-warning",
                alertState === "urgent" && "bg-urgent",
                alertState === "exceeded" && "bg-exceeded"
              )}
              style={{
                width: `${Math.min(
                  100,
                  ((weeklyUsedMinutes + (activeSession ? elapsedSeconds / 60 : 0)) /
                    weeklyLimitMinutes) *
                    100
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
