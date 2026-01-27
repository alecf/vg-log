import { TRPCError } from "@trpc/server";
import { eq, and, desc, lte, gte, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { router, protectedProcedure, parentProcedure } from "../lib/trpc.js";
import { limits, sessions, users, alertSettings } from "../db/schema.js";
import { generateId, getWeekStart, getWeekEnd, getAlertState } from "../lib/utils.js";
import { setLimitSchema } from "@vg-log/shared";

export const limitRouter = router({
  // Set a limit for a child (parent only)
  set: parentProcedure.input(setLimitSchema).mutation(async ({ ctx, input }) => {
    // Verify the target user is a child in the same family
    const targetUser = await ctx.db.query.users.findFirst({
      where: and(
        eq(users.id, input.userId),
        eq(users.familyId, ctx.family.id),
        eq(users.role, "child")
      ),
    });

    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Child not found in your family",
      });
    }

    const limitId = generateId();
    const now = new Date();

    await ctx.db.insert(limits).values({
      id: limitId,
      familyId: ctx.family.id,
      userId: input.userId,
      limitType: input.limitType,
      minutes: input.minutes,
      createdBy: ctx.user.id,
      effectiveFrom: now,
      createdAt: now,
    });

    return {
      limitId,
      effectiveFrom: now,
    };
  }),

  // Get current limits for a user
  get: protectedProcedure
    .input(z.object({ userId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      // Children can only see their own limits
      const targetUserId =
        ctx.user.role === "child" ? ctx.user.id : (input.userId ?? ctx.user.id);

      // Verify access if parent
      if (ctx.user.role === "parent" && input.userId) {
        const targetUser = await ctx.db.query.users.findFirst({
          where: and(
            eq(users.id, input.userId),
            eq(users.familyId, ctx.family.id)
          ),
        });

        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found in your family",
          });
        }
      }

      const now = new Date();

      // Get all active limits for the user
      const userLimits = await ctx.db.query.limits.findMany({
        where: and(
          eq(limits.userId, targetUserId),
          lte(limits.effectiveFrom, now)
        ),
        orderBy: desc(limits.effectiveFrom),
      });

      // Group by limit type and get the most recent for each
      const currentLimits: Record<string, typeof userLimits[0]> = {};
      for (const limit of userLimits) {
        if (!currentLimits[limit.limitType]) {
          currentLimits[limit.limitType] = limit;
        }
      }

      return Object.values(currentLimits);
    }),

  // Get remaining time for a user
  remaining: protectedProcedure
    .input(z.object({ userId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      // Children can only see their own remaining time
      const targetUserId =
        ctx.user.role === "child" ? ctx.user.id : (input.userId ?? ctx.user.id);

      const now = new Date();
      const weekStart = getWeekStart(now, ctx.family.timezone);
      const weekEnd = getWeekEnd(now, ctx.family.timezone);

      // Get weekly usage (including active session)
      const weeklyUsage = await ctx.db
        .select({
          totalMinutes: sql<number>`coalesce(sum(
            (coalesce(${sessions.endTime}, unixepoch()) - ${sessions.startTime}) / 60
          ), 0)`,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, targetUserId),
            gte(sessions.startTime, weekStart),
            lte(sessions.startTime, weekEnd)
          )
        );

      // Get weekly limit
      const weeklyLimit = await ctx.db.query.limits.findFirst({
        where: and(
          eq(limits.userId, targetUserId),
          eq(limits.limitType, "weekly"),
          lte(limits.effectiveFrom, now)
        ),
        orderBy: desc(limits.effectiveFrom),
      });

      // Get active session
      const activeSession = await ctx.db.query.sessions.findFirst({
        where: and(
          eq(sessions.userId, targetUserId),
          isNull(sessions.endTime)
        ),
      });

      // Get alert settings
      const userAlertSettings = await ctx.db.query.alertSettings.findFirst({
        where: eq(alertSettings.userId, targetUserId),
      });

      const usedMinutes = Math.round(weeklyUsage[0]?.totalMinutes ?? 0);
      const limitMinutes = weeklyLimit?.minutes ?? null;
      const remainingMinutes = limitMinutes !== null ? limitMinutes - usedMinutes : null;
      const isOverLimit = remainingMinutes !== null && remainingMinutes < 0;

      const warningThreshold = userAlertSettings?.warningMinutes ?? 15;
      const urgentThreshold = userAlertSettings?.urgentMinutes ?? 5;

      return {
        daily: {
          used: 0, // TODO: Implement daily tracking
          limit: null,
          remaining: null,
        },
        weekly: {
          used: usedMinutes,
          limit: limitMinutes,
          remaining: remainingMinutes,
        },
        activeSession: activeSession
          ? {
              id: activeSession.id,
              startTime: activeSession.startTime,
              elapsedMinutes: Math.round(
                (now.getTime() - activeSession.startTime.getTime()) / (1000 * 60)
              ),
            }
          : null,
        isOverLimit,
        alertState: remainingMinutes !== null
          ? getAlertState(remainingMinutes, warningThreshold, urgentThreshold)
          : "ok",
      };
    }),

  // Delete a limit (parent only)
  delete: parentProcedure
    .input(z.object({ limitId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const limit = await ctx.db.query.limits.findFirst({
        where: and(
          eq(limits.id, input.limitId),
          eq(limits.familyId, ctx.family.id)
        ),
      });

      if (!limit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Limit not found",
        });
      }

      await ctx.db.delete(limits).where(eq(limits.id, input.limitId));

      return { success: true };
    }),
});
