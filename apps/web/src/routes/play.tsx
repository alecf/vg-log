import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useTimerStore } from "@/stores/timer";
import { trpc } from "@/lib/trpc";
import {
  formatTime,
  formatDuration,
  cn,
  formatClockTime,
  toTimeInputValue,
  fromTimeInputValue,
} from "@/lib/utils";
import { useAudioAlert } from "@/hooks/useAudioAlert";

export const Route = createFileRoute("/play")({
  component: Play,
});

interface StoppedSession {
  id: string;
  startTime: Date;
  endTime: Date;
  originalEndTime: Date;
}

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

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [editingStartTime, setEditingStartTime] = useState(false);
  const [stoppedSession, setStoppedSession] = useState<StoppedSession | null>(null);
  const [editingEndTime, setEditingEndTime] = useState(false);

  // Track original start time for constraint (can only go backward from this)
  const [originalStartTime, setOriginalStartTime] = useState<Date | null>(null);

  // Audio alerts for timer warnings
  const { initAudio } = useAudioAlert(alertState, !!activeSession, {
    enabled: soundEnabled,
  });

  const utils = trpc.useUtils();

  // Fetch remaining time data
  const { data: remaining } = trpc.limit.remaining.useQuery(
    {},
    {
      refetchInterval: activeSession ? 30000 : 60000,
    }
  );

  // Fetch active session on mount
  const { data: activeSessionData } = trpc.session.active.useQuery();

  // Start session mutation
  const startSession = trpc.session.start.useMutation({
    onSuccess: (data) => {
      const startTime = new Date(data.startTime);
      const origStartTime = new Date(data.originalStartTime);
      setActiveSession({
        id: data.sessionId,
        startTime: startTime,
      });
      setOriginalStartTime(origStartTime);
      if (data.parentNotified) {
        setParentNotified(true);
      }
      utils.limit.remaining.invalidate();
    },
  });

  // Stop session mutation
  const stopSession = trpc.session.stop.useMutation({
    onSuccess: (data) => {
      const endTime = new Date(data.endTime);
      const origEndTime = new Date(data.originalEndTime);
      // Move to stopped confirmation state
      setStoppedSession({
        id: data.sessionId,
        startTime: activeSession!.startTime,
        endTime: endTime,
        originalEndTime: origEndTime,
      });
      setActiveSession(null);
      setOriginalStartTime(null);
      if (data.parentNotified) {
        setParentNotified(true);
      }
      utils.limit.remaining.invalidate();
      utils.stats.overview.invalidate();
    },
  });

  // Adjust start time mutation
  const adjustStart = trpc.session.adjustStart.useMutation({
    onSuccess: (data) => {
      const newStartTime = new Date(data.startTime);
      setActiveSession({
        id: data.sessionId,
        startTime: newStartTime,
      });
      setEditingStartTime(false);
    },
  });

  // Adjust end time mutation
  const adjustEnd = trpc.session.adjustEnd.useMutation({
    onSuccess: (data) => {
      const newEndTime = new Date(data.endTime);
      setStoppedSession((prev) =>
        prev ? { ...prev, endTime: newEndTime } : null
      );
      setEditingEndTime(false);
    },
  });

  // Sync active session from server
  useEffect(() => {
    if (activeSessionData) {
      const startTime = new Date(activeSessionData.startTime);
      const origStartTime = new Date(activeSessionData.originalStartTime);
      setActiveSession({
        id: activeSessionData.id,
        startTime: startTime,
      });
      // Set original start time from server
      if (!originalStartTime) {
        setOriginalStartTime(origStartTime);
      }
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

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== "child") {
    return <Navigate to="/" />;
  }

  const weeklyLimitMinutes = remaining?.weekly.limit ?? null;
  const weeklyUsedMinutes = remaining?.weekly.used ?? 0;
  const isOverLimit = remaining?.isOverLimit ?? false;

  // Calculate time constraints for start time picker
  const getStartTimeMin = () => {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    return toTimeInputValue(todayMidnight);
  };

  const getStartTimeMax = () => {
    if (originalStartTime) {
      return toTimeInputValue(originalStartTime);
    }
    return toTimeInputValue(new Date());
  };

  // Calculate time constraints for end time picker
  const getEndTimeMin = () => {
    if (stoppedSession) {
      const tenMinBefore = new Date(
        stoppedSession.originalEndTime.getTime() - 10 * 60 * 1000
      );
      // Also can't be before start time
      const minTime = tenMinBefore > stoppedSession.startTime ? tenMinBefore : stoppedSession.startTime;
      return toTimeInputValue(minTime);
    }
    return "00:00";
  };

  const getEndTimeMax = () => {
    if (stoppedSession) {
      return toTimeInputValue(stoppedSession.originalEndTime);
    }
    return toTimeInputValue(new Date());
  };

  const handleStartTimeChange = (timeStr: string) => {
    if (!activeSession) return;
    const newStartTime = fromTimeInputValue(timeStr, new Date());
    adjustStart.mutate({
      sessionId: activeSession.id,
      startTime: newStartTime,
    });
  };

  const handleEndTimeChange = (timeStr: string) => {
    if (!stoppedSession) return;
    const newEndTime = fromTimeInputValue(timeStr, new Date());
    adjustEnd.mutate({
      sessionId: stoppedSession.id,
      endTime: newEndTime,
    });
  };

  const handleDone = () => {
    setStoppedSession(null);
    setEditingEndTime(false);
  };

  // IDLE STATE - No session, show Start button
  if (!activeSession && !stoppedSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        {/* Remaining time display */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">You have</p>
          <p
            className={cn(
              "text-6xl font-bold font-mono transition-colors",
              isOverLimit ? "text-exceeded" : "text-ok"
            )}
          >
            {weeklyLimitMinutes !== null
              ? formatDuration(weeklyLimitMinutes - weeklyUsedMinutes)
              : "No limit"}
          </p>
          {weeklyLimitMinutes !== null && (
            <p className="text-sm text-muted-foreground mt-1">this week</p>
          )}
        </div>

        {/* Parent notified indicator */}
        {parentNotified && (
          <div className="rounded-lg bg-exceeded/20 border border-exceeded/30 px-4 py-2 text-exceeded text-sm">
            Your parents have been notified
          </div>
        )}

        {/* Start button */}
        <button
          onClick={() => {
            initAudio();
            startSession.mutate({});
          }}
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

        {/* Over limit warning */}
        {isOverLimit && (
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
              <span>{formatDuration(weeklyUsedMinutes)} used</span>
              <span>{formatDuration(weeklyLimitMinutes)} limit</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-1000",
                  isOverLimit ? "bg-exceeded" : "bg-ok"
                )}
                style={{
                  width: `${Math.min(100, (weeklyUsedMinutes / weeklyLimitMinutes) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Sound toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {soundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
        </button>
      </div>
    );
  }

  // ACTIVE SESSION STATE
  if (activeSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        {/* Remaining time display */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Time remaining</p>
          <p
            className={cn(
              "text-5xl font-bold font-mono transition-colors",
              alertState === "ok" && "text-ok",
              alertState === "warning" && "text-warning",
              alertState === "urgent" && "text-urgent animate-pulse",
              alertState === "exceeded" && "text-exceeded animate-pulse"
            )}
          >
            {remainingSeconds !== null ? formatTime(remainingSeconds) : "No limit"}
          </p>
        </div>

        {/* Parent notified indicator */}
        {parentNotified && (
          <div className="rounded-lg bg-exceeded/20 border border-exceeded/30 px-4 py-2 text-exceeded text-sm">
            Your parents have been notified
          </div>
        )}

        {/* START REGION - Always visible during active session */}
        <div className="w-full max-w-xs bg-card rounded-xl p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Started at</p>
              {editingStartTime ? (
                <input
                  type="time"
                  className="text-lg font-medium bg-transparent border-b border-primary focus:outline-none"
                  defaultValue={toTimeInputValue(activeSession.startTime)}
                  min={getStartTimeMin()}
                  max={getStartTimeMax()}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  autoFocus
                  onBlur={() => setEditingStartTime(false)}
                />
              ) : (
                <p className="text-lg font-medium">
                  {formatClockTime(activeSession.startTime)}
                </p>
              )}
            </div>
            {!editingStartTime && (
              <button
                onClick={() => setEditingStartTime(true)}
                disabled={adjustStart.isPending}
                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
              >
                {adjustStart.isPending ? "..." : "Adjust"}
              </button>
            )}
          </div>
          {editingStartTime && (
            <p className="text-xs text-muted-foreground mt-2">
              Can adjust back to midnight today
            </p>
          )}
        </div>

        {/* Playing for timer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Playing for</p>
          <p className="text-3xl font-mono text-primary">{formatTime(elapsedSeconds)}</p>
        </div>

        {/* STOP REGION - Stop button */}
        <button
          onClick={() => stopSession.mutate({ sessionId: activeSession.id })}
          disabled={stopSession.isPending}
          className={cn(
            "w-40 h-40 rounded-full text-xl font-bold transition-all",
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

        {/* Progress bar */}
        {weeklyLimitMinutes !== null && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>
                {formatDuration(weeklyUsedMinutes + Math.floor(elapsedSeconds / 60))} used
              </span>
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
                    ((weeklyUsedMinutes + elapsedSeconds / 60) / weeklyLimitMinutes) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Sound toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {soundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
        </button>
      </div>
    );
  }

  // STOPPED CONFIRMATION STATE
  if (stoppedSession) {
    const durationMinutes = Math.floor(
      (stoppedSession.endTime.getTime() - stoppedSession.startTime.getTime()) / (1000 * 60)
    );

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">Session Ended</p>
          <p className="text-muted-foreground mt-1">
            You played for {formatDuration(durationMinutes)}
          </p>
        </div>

        {/* START REGION - Read only now */}
        <div className="w-full max-w-xs bg-card rounded-xl p-4 border opacity-60">
          <p className="text-xs text-muted-foreground">Started at</p>
          <p className="text-lg font-medium">
            {formatClockTime(stoppedSession.startTime)}
          </p>
        </div>

        {/* STOP REGION - Editable */}
        <div className="w-full max-w-xs bg-card rounded-xl p-4 border border-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Stopped at</p>
              {editingEndTime ? (
                <input
                  type="time"
                  className="text-lg font-medium bg-transparent border-b border-primary focus:outline-none"
                  defaultValue={toTimeInputValue(stoppedSession.endTime)}
                  min={getEndTimeMin()}
                  max={getEndTimeMax()}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  autoFocus
                  onBlur={() => setEditingEndTime(false)}
                />
              ) : (
                <p className="text-lg font-medium">
                  {formatClockTime(stoppedSession.endTime)}
                </p>
              )}
            </div>
            {!editingEndTime && (
              <button
                onClick={() => setEditingEndTime(true)}
                disabled={adjustEnd.isPending}
                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
              >
                {adjustEnd.isPending ? "..." : "Adjust"}
              </button>
            )}
          </div>
          {editingEndTime && (
            <p className="text-xs text-muted-foreground mt-2">
              Can adjust up to 10 minutes earlier
            </p>
          )}
        </div>

        {/* Done button */}
        <button
          onClick={handleDone}
          className={cn(
            "w-full max-w-xs py-4 rounded-xl text-lg font-bold transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          Done
        </button>
      </div>
    );
  }

  return null;
}
