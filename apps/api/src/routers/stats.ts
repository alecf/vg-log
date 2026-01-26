import { eq, and, gte, lte, desc, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { router, protectedProcedure } from "../lib/trpc.js";
import { sessions, limits, users } from "../db/schema.js";
import {
  getWeekStart,
  getWeekEnd,
  getDurationMinutes,
} from "../lib/utils.js";
import { calendarQuerySchema } from "@vg-log/shared";

export const statsRouter = router({
  // Get weekly summary
  weekly: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        weekOffset: z.number().int().min(-52).max(0).default(0), // 0 = current week, -1 = last week
      })
    )
    .query(async ({ ctx, input }) => {
      const targetUserId =
        ctx.user.role === "child" ? ctx.user.id : (input.userId ?? ctx.user.id);

      const now = new Date();
      const baseDate = new Date(now);
      baseDate.setDate(baseDate.getDate() + input.weekOffset * 7);

      const weekStart = getWeekStart(baseDate, ctx.family.timezone);
      const weekEnd = getWeekEnd(baseDate, ctx.family.timezone);

      // Get all sessions for the week
      const weekSessions = await ctx.db.query.sessions.findMany({
        where: and(
          eq(sessions.userId, targetUserId),
          gte(sessions.startTime, weekStart),
          lte(sessions.startTime, weekEnd)
        ),
        orderBy: desc(sessions.startTime),
      });

      // Calculate total minutes
      let totalMinutes = 0;
      for (const session of weekSessions) {
        const end = session.endTime ?? now;
        totalMinutes += getDurationMinutes(session.startTime, end);
      }

      // Get weekly limit
      const weeklyLimit = await ctx.db.query.limits.findFirst({
        where: and(
          eq(limits.userId, targetUserId),
          eq(limits.limitType, "weekly"),
          lte(limits.effectiveFrom, weekEnd)
        ),
        orderBy: desc(limits.effectiveFrom),
      });

      // Calculate daily breakdown
      const dailyBreakdown: { date: Date; minutes: number; sessionCount: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(weekStart);
        dayStart.setDate(dayStart.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const daySessions = weekSessions.filter(
          (s) => s.startTime >= dayStart && s.startTime <= dayEnd
        );

        let dayMinutes = 0;
        for (const session of daySessions) {
          const end = session.endTime ?? now;
          dayMinutes += getDurationMinutes(session.startTime, end);
        }

        dailyBreakdown.push({
          date: dayStart,
          minutes: dayMinutes,
          sessionCount: daySessions.length,
        });
      }

      // Get last week's total for comparison
      let comparison = null;
      if (input.weekOffset === 0) {
        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(weekEnd);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

        const lastWeekSessions = await ctx.db.query.sessions.findMany({
          where: and(
            eq(sessions.userId, targetUserId),
            gte(sessions.startTime, lastWeekStart),
            lte(sessions.startTime, lastWeekEnd)
          ),
        });

        let lastWeekMinutes = 0;
        for (const session of lastWeekSessions) {
          const end = session.endTime ?? lastWeekEnd;
          lastWeekMinutes += getDurationMinutes(session.startTime, end);
        }

        const changePercent =
          lastWeekMinutes > 0
            ? Math.round(((totalMinutes - lastWeekMinutes) / lastWeekMinutes) * 100)
            : totalMinutes > 0
            ? 100
            : 0;

        comparison = {
          lastWeekMinutes,
          changePercent,
          trend:
            changePercent > 5
              ? ("up" as const)
              : changePercent < -5
              ? ("down" as const)
              : ("same" as const),
        };
      }

      return {
        weekStart,
        weekEnd,
        totalMinutes,
        limitMinutes: weeklyLimit?.minutes ?? null,
        sessions: weekSessions.map((s) => ({
          ...s,
          durationMinutes: s.endTime
            ? getDurationMinutes(s.startTime, s.endTime)
            : getDurationMinutes(s.startTime, now),
        })),
        dailyBreakdown,
        comparison,
      };
    }),

  // Get calendar data for a month
  calendar: protectedProcedure.input(calendarQuerySchema).query(async ({ ctx, input }) => {
    const targetUserId =
      ctx.user.role === "child" ? ctx.user.id : (input.userId ?? ctx.user.id);

    // Get start and end of month
    const monthStart = new Date(input.year, input.month - 1, 1);
    const monthEnd = new Date(input.year, input.month, 0, 23, 59, 59, 999);

    // Get all sessions for the month
    const monthSessions = await ctx.db.query.sessions.findMany({
      where: and(
        eq(sessions.userId, targetUserId),
        gte(sessions.startTime, monthStart),
        lte(sessions.startTime, monthEnd)
      ),
    });

    // Get weekly limit
    const weeklyLimit = await ctx.db.query.limits.findFirst({
      where: and(
        eq(limits.userId, targetUserId),
        eq(limits.limitType, "weekly"),
        lte(limits.effectiveFrom, monthEnd)
      ),
      orderBy: desc(limits.effectiveFrom),
    });

    const dailyLimitMinutes = weeklyLimit ? weeklyLimit.minutes / 7 : null;

    // Build calendar data
    const now = new Date();
    const days: {
      date: Date;
      totalMinutes: number;
      sessionCount: number;
      isOverLimit: boolean;
    }[] = [];

    const daysInMonth = monthEnd.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(input.year, input.month - 1, day);
      const dayEnd = new Date(input.year, input.month - 1, day, 23, 59, 59, 999);

      const daySessions = monthSessions.filter(
        (s) => s.startTime >= dayStart && s.startTime <= dayEnd
      );

      let dayMinutes = 0;
      for (const session of daySessions) {
        const end = session.endTime ?? now;
        dayMinutes += getDurationMinutes(session.startTime, end);
      }

      days.push({
        date: dayStart,
        totalMinutes: dayMinutes,
        sessionCount: daySessions.length,
        isOverLimit: dailyLimitMinutes !== null && dayMinutes > dailyLimitMinutes,
      });
    }

    return {
      year: input.year,
      month: input.month,
      days,
      totalMonthMinutes: days.reduce((sum, d) => sum + d.totalMinutes, 0),
      totalSessions: monthSessions.length,
    };
  }),

  // Get overview for dashboard
  overview: protectedProcedure
    .input(z.object({ userId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const targetUserId =
        ctx.user.role === "child" ? ctx.user.id : (input.userId ?? ctx.user.id);

      const now = new Date();
      const weekStart = getWeekStart(now, ctx.family.timezone);
      const weekEnd = getWeekEnd(now, ctx.family.timezone);

      // Get this week's sessions
      const weekSessions = await ctx.db.query.sessions.findMany({
        where: and(
          eq(sessions.userId, targetUserId),
          gte(sessions.startTime, weekStart),
          lte(sessions.startTime, weekEnd)
        ),
        orderBy: desc(sessions.startTime),
        limit: 10,
      });

      // Calculate total minutes
      let weeklyMinutes = 0;
      for (const session of weekSessions) {
        const end = session.endTime ?? now;
        weeklyMinutes += getDurationMinutes(session.startTime, end);
      }

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

      return {
        weeklyMinutes,
        weeklyLimitMinutes: weeklyLimit?.minutes ?? null,
        remainingMinutes:
          weeklyLimit !== null ? (weeklyLimit?.minutes ?? 0) - weeklyMinutes : null,
        isOverLimit:
          weeklyLimit !== null && weeklyMinutes > (weeklyLimit?.minutes ?? 0),
        hasActiveSession: activeSession !== null,
        activeSession: activeSession
          ? {
              id: activeSession.id,
              startTime: activeSession.startTime,
              elapsedMinutes: getDurationMinutes(activeSession.startTime, now),
            }
          : null,
        recentSessions: weekSessions.slice(0, 5).map((s) => ({
          ...s,
          durationMinutes: s.endTime
            ? getDurationMinutes(s.startTime, s.endTime)
            : getDurationMinutes(s.startTime, now),
          isActive: s.endTime === null,
        })),
      };
    }),

  // Get family overview (for parents)
  familyOverview: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "parent") {
      return null;
    }

    const children = await ctx.db.query.users.findMany({
      where: and(
        eq(users.familyId, ctx.family.id),
        eq(users.role, "child")
      ),
    });

    const now = new Date();
    const weekStart = getWeekStart(now, ctx.family.timezone);
    const weekEnd = getWeekEnd(now, ctx.family.timezone);

    const childrenStatus = await Promise.all(
      children.map(async (child) => {
        // Get week's sessions
        const weekUsage = await ctx.db
          .select({
            totalMinutes: sql<number>`coalesce(sum(
              (coalesce(${sessions.endTime}, unixepoch()) - ${sessions.startTime}) / 60
            ), 0)`,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.userId, child.id),
              gte(sessions.startTime, weekStart),
              lte(sessions.startTime, weekEnd)
            )
          );

        // Get limit
        const weeklyLimit = await ctx.db.query.limits.findFirst({
          where: and(
            eq(limits.userId, child.id),
            eq(limits.limitType, "weekly"),
            lte(limits.effectiveFrom, now)
          ),
          orderBy: desc(limits.effectiveFrom),
        });

        // Get active session
        const activeSession = await ctx.db.query.sessions.findFirst({
          where: and(
            eq(sessions.userId, child.id),
            isNull(sessions.endTime)
          ),
        });

        const usedMinutes = Math.round(weekUsage[0]?.totalMinutes ?? 0);
        const limitMinutes = weeklyLimit?.minutes ?? null;

        return {
          id: child.id,
          name: child.name,
          weeklyMinutes: usedMinutes,
          weeklyLimitMinutes: limitMinutes,
          remainingMinutes: limitMinutes !== null ? limitMinutes - usedMinutes : null,
          isOverLimit: limitMinutes !== null && usedMinutes > limitMinutes,
          hasActiveSession: activeSession !== null,
        };
      })
    );

    return {
      children: childrenStatus,
    };
  }),
});
