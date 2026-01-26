import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { router, protectedProcedure, parentProcedure } from "../lib/trpc.js";
import { notifications, notificationPreferences } from "../db/schema.js";
import { generateId } from "../lib/utils.js";
import { notificationPreferencesSchema } from "@vg-log/shared";

export const notificationRouter = router({
  // Get notifications for current user
  list: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(notifications.targetUserId, ctx.user.id)];

      if (input.unreadOnly) {
        conditions.push(eq(notifications.read, false));
      }

      const results = await ctx.db.query.notifications.findMany({
        where: and(...conditions),
        orderBy: desc(notifications.createdAt),
        limit: input.limit,
      });

      return results;
    }),

  // Get unread count
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const results = await ctx.db.query.notifications.findMany({
      where: and(
        eq(notifications.targetUserId, ctx.user.id),
        eq(notifications.read, false)
      ),
    });

    return { count: results.length };
  }),

  // Mark notification as read
  markRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.targetUserId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Mark all notifications as read
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.targetUserId, ctx.user.id));

    return { success: true };
  }),

  // Get notification preferences (parent only)
  getPreferences: parentProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, ctx.user.id),
    });

    return (
      prefs ?? {
        browserNotifications: true,
        inAppBanner: true,
        emailNotifications: false,
      }
    );
  }),

  // Update notification preferences (parent only)
  updatePreferences: parentProcedure
    .input(notificationPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.userId, ctx.user.id),
      });

      if (existing) {
        await ctx.db
          .update(notificationPreferences)
          .set({
            browserNotifications: input.browserNotifications,
            inAppBanner: input.inAppBanner,
            emailNotifications: input.emailNotifications,
          })
          .where(eq(notificationPreferences.userId, ctx.user.id));
      } else {
        await ctx.db.insert(notificationPreferences).values({
          id: generateId(),
          userId: ctx.user.id,
          browserNotifications: input.browserNotifications,
          inAppBanner: input.inAppBanner,
          emailNotifications: input.emailNotifications,
        });
      }

      return { success: true };
    }),
});
