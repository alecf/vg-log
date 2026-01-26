import type { z } from "zod";
import type {
  userRoleSchema,
  limitTypeSchema,
  alertStateSchema,
  createFamilySchema,
  joinFamilySchema,
  setLimitSchema,
  alertSettingsSchema,
  notificationPreferencesSchema,
} from "../schemas/index.js";

// Enum types
export type UserRole = z.infer<typeof userRoleSchema>;
export type LimitType = z.infer<typeof limitTypeSchema>;
export type AlertState = z.infer<typeof alertStateSchema>;

// Input types (from schemas)
export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type JoinFamilyInput = z.infer<typeof joinFamilySchema>;
export type SetLimitInput = z.infer<typeof setLimitSchema>;
export type AlertSettingsInput = z.infer<typeof alertSettingsSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

// Database entity types
export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  timezone: string;
  createdAt: Date;
}

export interface User {
  id: string;
  familyId: string;
  name: string;
  role: UserRole;
  pin: string | null;
  email: string | null;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  familyId: string;
  startTime: Date;
  endTime: Date | null;
  notes: string | null;
  isManual: boolean;
  createdAt: Date;
}

export interface Limit {
  id: string;
  familyId: string;
  userId: string;
  limitType: LimitType;
  minutes: number;
  createdBy: string;
  effectiveFrom: Date;
  createdAt: Date;
}

export interface AlertSettings {
  id: string;
  userId: string;
  warningMinutes: number;
  urgentMinutes: number;
  soundEnabled: boolean;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  browserNotifications: boolean;
  inAppBanner: boolean;
  emailNotifications: boolean;
}

// API response types
export interface RemainingTime {
  daily: {
    used: number; // minutes
    limit: number | null;
    remaining: number | null;
  };
  weekly: {
    used: number;
    limit: number | null;
    remaining: number | null;
  };
  activeSession: {
    id: string;
    startTime: Date;
    elapsedMinutes: number;
  } | null;
  isOverLimit: boolean;
  alertState: AlertState;
}

export interface DailySummary {
  date: Date;
  minutes: number;
  sessionCount: number;
}

export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  totalMinutes: number;
  limitMinutes: number | null;
  sessions: Session[];
  dailyBreakdown: DailySummary[];
  comparison: {
    lastWeekMinutes: number;
    changePercent: number;
    trend: "up" | "down" | "same";
  } | null;
}

export interface CalendarDay {
  date: Date;
  totalMinutes: number;
  sessionCount: number;
  isOverLimit: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: UserRole;
  isCurrentUser: boolean;
  status?: {
    remaining: RemainingTime;
    hasActiveSession: boolean;
    isOverLimit: boolean;
  };
}

// Notification types
export interface Notification {
  id: string;
  type: "limit_exceeded" | "session_started_over_limit";
  userId: string; // child who triggered
  familyId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
