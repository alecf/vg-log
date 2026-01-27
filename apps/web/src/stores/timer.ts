import { create } from "zustand";

export type AlertState = "ok" | "warning" | "urgent" | "exceeded";

interface ActiveSession {
  id: string;
  startTime: Date;
}

interface TimerState {
  activeSession: ActiveSession | null;
  elapsedSeconds: number;
  remainingSeconds: number | null;
  weeklyLimitMinutes: number | null;
  weeklyUsedMinutes: number;
  alertState: AlertState;
  parentNotified: boolean;
  warningThreshold: number;
  urgentThreshold: number;

  // Actions
  setActiveSession: (session: ActiveSession | null) => void;
  setWeeklyData: (used: number, limit: number | null) => void;
  setThresholds: (warning: number, urgent: number) => void;
  tick: () => void;
  setParentNotified: (notified: boolean) => void;
  reset: () => void;
}

function calculateAlertState(
  remainingSeconds: number | null,
  warningThreshold: number,
  urgentThreshold: number
): AlertState {
  if (remainingSeconds === null) return "ok";
  const remainingMinutes = remainingSeconds / 60;
  if (remainingMinutes <= 0) return "exceeded";
  if (remainingMinutes <= urgentThreshold) return "urgent";
  if (remainingMinutes <= warningThreshold) return "warning";
  return "ok";
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeSession: null,
  elapsedSeconds: 0,
  remainingSeconds: null,
  weeklyLimitMinutes: null,
  weeklyUsedMinutes: 0,
  alertState: "ok",
  parentNotified: false,
  warningThreshold: 15,
  urgentThreshold: 5,

  setActiveSession: (session) => {
    if (session) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.startTime).getTime()) / 1000
      );
      const { weeklyLimitMinutes, weeklyUsedMinutes, warningThreshold, urgentThreshold } =
        get();
      const remaining =
        weeklyLimitMinutes !== null
          ? (weeklyLimitMinutes - weeklyUsedMinutes) * 60 - elapsed
          : null;

      set({
        activeSession: session,
        elapsedSeconds: elapsed,
        remainingSeconds: remaining,
        alertState: calculateAlertState(remaining, warningThreshold, urgentThreshold),
      });
    } else {
      set({
        activeSession: null,
        elapsedSeconds: 0,
        remainingSeconds: null,
        alertState: "ok",
        parentNotified: false,
      });
    }
  },

  setWeeklyData: (used, limit) => {
    const { activeSession, elapsedSeconds, warningThreshold, urgentThreshold } = get();
    const remaining =
      limit !== null
        ? (limit - used) * 60 - (activeSession ? elapsedSeconds : 0)
        : null;

    set({
      weeklyUsedMinutes: used,
      weeklyLimitMinutes: limit,
      remainingSeconds: remaining,
      alertState: calculateAlertState(remaining, warningThreshold, urgentThreshold),
    });
  },

  setThresholds: (warning, urgent) => {
    const { remainingSeconds } = get();
    set({
      warningThreshold: warning,
      urgentThreshold: urgent,
      alertState: calculateAlertState(remainingSeconds, warning, urgent),
    });
  },

  tick: () => {
    const state = get();
    if (!state.activeSession) return;

    const newElapsed = state.elapsedSeconds + 1;
    const newRemaining =
      state.remainingSeconds !== null ? state.remainingSeconds - 1 : null;
    const newAlertState = calculateAlertState(
      newRemaining,
      state.warningThreshold,
      state.urgentThreshold
    );

    set({
      elapsedSeconds: newElapsed,
      remainingSeconds: newRemaining,
      alertState: newAlertState,
    });
  },

  setParentNotified: (notified) => set({ parentNotified: notified }),

  reset: () =>
    set({
      activeSession: null,
      elapsedSeconds: 0,
      remainingSeconds: null,
      alertState: "ok",
      parentNotified: false,
    }),
}));
