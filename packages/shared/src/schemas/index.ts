import { z } from "zod";

// Enums
export const userRoleSchema = z.enum(["parent", "child"]);
export const limitTypeSchema = z.enum(["daily", "weekend_daily", "weekly", "monthly"]);
export const alertStateSchema = z.enum(["ok", "warning", "urgent", "exceeded"]);

// Family schemas
export const createFamilySchema = z.object({
  name: z.string().min(1).max(100),
  timezone: z.string().default("America/Los_Angeles"),
});

export const joinFamilySchema = z.object({
  inviteCode: z.string().length(6),
  name: z.string().min(1).max(100),
  role: userRoleSchema,
  pin: z.string().length(4).regex(/^\d{4}$/, "PIN must be 4 digits").optional(),
});

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  role: userRoleSchema,
  pin: z.string().length(4).regex(/^\d{4}$/).optional(),
  email: z.string().email().optional(),
});

export const loginSchema = z.object({
  oderId: z.string().uuid(),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

// Session schemas
export const startSessionSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const stopSessionSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

export const manualSessionSchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

// Limit schemas
export const setLimitSchema = z.object({
  userId: z.string().uuid(),
  limitType: limitTypeSchema,
  minutes: z.number().int().min(0).max(10080), // max 1 week in minutes
});

// Alert settings schema
export const alertSettingsSchema = z.object({
  warningMinutes: z.number().int().min(1).max(60).default(15),
  urgentMinutes: z.number().int().min(1).max(30).default(5),
  soundEnabled: z.boolean().default(true),
});

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  browserNotifications: z.boolean().default(true),
  inAppBanner: z.boolean().default(true),
  emailNotifications: z.boolean().default(false),
});

// Query schemas
export const sessionListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const calendarQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});
