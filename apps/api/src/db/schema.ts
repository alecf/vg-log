import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// Family group
export const families = sqliteTable("families", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  childInviteCode: text("child_invite_code").notNull().unique(),
  parentInviteCode: text("parent_invite_code").notNull().unique(),
  isLocked: integer("is_locked", { mode: "boolean" }).notNull().default(false),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Users (parents and kids)
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role", { enum: ["parent", "child"] }).notNull(),
    pin: text("pin"), // 4-digit PIN for kids
    email: text("email"), // Optional, mainly for parents
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("users_family_id_idx").on(table.familyId)]
);

// Gaming sessions
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    startTime: integer("start_time", { mode: "timestamp" }).notNull(),
    endTime: integer("end_time", { mode: "timestamp" }), // null = active session
    notes: text("notes"),
    isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_family_id_idx").on(table.familyId),
    index("sessions_start_time_idx").on(table.startTime),
  ]
);

// Time limits set by parents
export const limits = sqliteTable(
  "limits",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // which child
    limitType: text("limit_type", {
      enum: ["daily", "weekend_daily", "weekly", "monthly"],
    }).notNull(),
    minutes: integer("minutes").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    effectiveFrom: integer("effective_from", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("limits_user_id_idx").on(table.userId),
    index("limits_family_id_idx").on(table.familyId),
  ]
);

// Alert settings per user
export const alertSettings = sqliteTable("alert_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  warningMinutes: integer("warning_minutes").notNull().default(15),
  urgentMinutes: integer("urgent_minutes").notNull().default(5),
  soundEnabled: integer("sound_enabled", { mode: "boolean" }).notNull().default(true),
});

// Notification preferences for parents
export const notificationPreferences = sqliteTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  browserNotifications: integer("browser_notifications", { mode: "boolean" })
    .notNull()
    .default(true),
  inAppBanner: integer("in_app_banner", { mode: "boolean" }).notNull().default(true),
  emailNotifications: integer("email_notifications", { mode: "boolean" })
    .notNull()
    .default(false),
});

// Notifications (for parent alerts about kids)
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    type: text("type", {
      enum: ["limit_exceeded", "session_started_over_limit"],
    }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // child who triggered
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // parent to notify
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("notifications_target_user_id_idx").on(table.targetUserId),
    index("notifications_family_id_idx").on(table.familyId),
  ]
);

// Type exports for use with Drizzle
export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Limit = typeof limits.$inferSelect;
export type NewLimit = typeof limits.$inferInsert;
export type AlertSetting = typeof alertSettings.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
