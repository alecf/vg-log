import { TRPCError } from "@trpc/server";
import { eq, and, isNull, not, desc, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  router,
  protectedProcedure,
  childProcedure,
  parentProcedure,
} from "../lib/trpc.js";
import { sessions, users, limits, notifications } from "../db/schema.js";
import { generateId, getWeekStart, getWeekEnd, getDurationMinutes, getDayStart } from "../lib/utils.js";
import { sessionListQuerySchema, manualSessionSchema } from "@vg-log/shared";

export const sessionRouter = router({
  // Start a new session (child only)
  start: childProcedure
    .input(z.object({ notes: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      // Check for existing active session
      const activeSession = await ctx.db.query.sessions.findFirst({
        where: and(
          eq(sessions.userId, ctx.user.id),
          isNull(sessions.endTime)
        ),
      });

      if (activeSession) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have an active session",
        });
      }

      const sessionId = generateId();
      const now = new Date();

      // Check if user is over limit and notify parents if so
      const weekStart = getWeekStart(now, ctx.family.timezone);
      const weekEnd = getWeekEnd(now, ctx.family.timezone);

      // Get current week's usage
      const weeklyUsage = await ctx.db
        .select({
          totalMinutes: sql<number>`coalesce(sum(
            (coalesce(${sessions.endTime}, unixepoch()) - ${sessions.startTime}) / 60
          ), 0)`,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, ctx.user.id),
            gte(sessions.startTime, weekStart),
            lte(sessions.startTime, weekEnd)
          )
        );

      // Get weekly limit
      const weeklyLimit = await ctx.db.query.limits.findFirst({
        where: and(
          eq(limits.userId, ctx.user.id),
          eq(limits.limitType, "weekly"),
          lte(limits.effectiveFrom, now)
        ),
        orderBy: desc(limits.effectiveFrom),
      });

      const usedMinutes = weeklyUsage[0]?.totalMinutes ?? 0;
      const isOverLimit = weeklyLimit ? usedMinutes >= weeklyLimit.minutes : false;

      // If starting session while over limit, notify parents
      if (isOverLimit) {
        const parents = await ctx.db.query.users.findMany({
          where: and(
            eq(users.familyId, ctx.family.id),
            eq(users.role, "parent")
          ),
        });

        for (const parent of parents) {
          await ctx.db.insert(notifications).values({
            id: generateId(),
            type: "session_started_over_limit",
            userId: ctx.user.id,
            targetUserId: parent.id,
            familyId: ctx.family.id,
            message: `${ctx.user.name} started playing while over their weekly limit`,
            read: false,
            createdAt: now,
          });
        }
      }

      // Create the session
      await ctx.db.insert(sessions).values({
        id: sessionId,
        userId: ctx.user.id,
        familyId: ctx.family.id,
        startTime: now,
        endTime: null,
        originalStartTime: now, // Track original for adjustment limits
        notes: input.notes ?? null,
        isManual: false,
        createdAt: now,
      });

      return {
        sessionId,
        startTime: now,
        originalStartTime: now,
        isOverLimit,
        parentNotified: isOverLimit,
      };
    }),

  // Stop the active session (child only)
  stop: childProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.query.sessions.findFirst({
        where: and(
          eq(sessions.id, input.sessionId),
          eq(sessions.userId, ctx.user.id),
          isNull(sessions.endTime)
        ),
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active session not found",
        });
      }

      const now = new Date();
      const durationMinutes = getDurationMinutes(session.startTime, now);

      await ctx.db
        .update(sessions)
        .set({
          endTime: now,
          originalEndTime: now, // Track original for adjustment limits
          notes: input.notes ?? session.notes,
        })
        .where(eq(sessions.id, input.sessionId));

      // Check if this session pushed them over the limit
      const weekStart = getWeekStart(now, ctx.family.timezone);
      const weekEnd = getWeekEnd(now, ctx.family.timezone);

      const weeklyUsage = await ctx.db
        .select({
          totalMinutes: sql<number>`coalesce(sum(
            (${sessions.endTime} - ${sessions.startTime}) / 60
          ), 0)`,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, ctx.user.id),
            gte(sessions.startTime, weekStart),
            lte(sessions.startTime, weekEnd),
            not(isNull(sessions.endTime))
          )
        );

      const weeklyLimit = await ctx.db.query.limits.findFirst({
        where: and(
          eq(limits.userId, ctx.user.id),
          eq(limits.limitType, "weekly"),
          lte(limits.effectiveFrom, now)
        ),
        orderBy: desc(limits.effectiveFrom),
      });

      const usedMinutes = weeklyUsage[0]?.totalMinutes ?? 0;
      const isOverLimit = weeklyLimit ? usedMinutes > weeklyLimit.minutes : false;

      // Notify parents if limit exceeded
      if (isOverLimit && weeklyLimit) {
        const parents = await ctx.db.query.users.findMany({
          where: and(
            eq(users.familyId, ctx.family.id),
            eq(users.role, "parent")
          ),
        });

        for (const parent of parents) {
          await ctx.db.insert(notifications).values({
            id: generateId(),
            type: "limit_exceeded",
            userId: ctx.user.id,
            targetUserId: parent.id,
            familyId: ctx.family.id,
            message: `${ctx.user.name} has exceeded their weekly limit of ${weeklyLimit.minutes} minutes`,
            read: false,
            createdAt: now,
          });
        }
      }

      return {
        sessionId: input.sessionId,
        endTime: now,
        originalEndTime: now,
        durationMinutes,
        isOverLimit,
        parentNotified: isOverLimit,
      };
    }),

  // Adjust start time of active session (child only)
  adjustStart: childProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        startTime: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.query.sessions.findFirst({
        where: and(
          eq(sessions.id, input.sessionId),
          eq(sessions.userId, ctx.user.id),
          isNull(sessions.endTime)
        ),
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active session not found",
        });
      }

      // Use originalStartTime for validation (fallback to startTime for legacy sessions)
      const originalStart = session.originalStartTime ?? session.startTime;

      // Validate: new start time must not be after the original start time
      if (input.startTime > originalStart) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start time cannot be moved forward past original start time",
        });
      }

      // Validate: new start time must be today or later
      const todayStart = getDayStart(new Date(), ctx.family.timezone);
      if (input.startTime < todayStart) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start time cannot be before today",
        });
      }

      await ctx.db
        .update(sessions)
        .set({ startTime: input.startTime })
        .where(eq(sessions.id, input.sessionId));

      return {
        sessionId: input.sessionId,
        startTime: input.startTime,
      };
    }),

  // Adjust end time of a recently stopped session (child only)
  adjustEnd: childProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        endTime: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.query.sessions.findFirst({
        where: and(
          eq(sessions.id, input.sessionId),
          eq(sessions.userId, ctx.user.id),
          not(isNull(sessions.endTime))
        ),
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Stopped session not found",
        });
      }

      // Use originalEndTime for validation (fallback to endTime for legacy sessions)
      const originalEnd = session.originalEndTime ?? session.endTime!;

      // Validate: new end time must not be after the original end time
      if (input.endTime > originalEnd) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time cannot be moved forward past original end time",
        });
      }

      // Validate: new end time must be within 10 minutes of original end
      const tenMinutesBeforeEnd = new Date(originalEnd.getTime() - 10 * 60 * 1000);
      if (input.endTime < tenMinutesBeforeEnd) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time cannot be more than 10 minutes earlier",
        });
      }

      // Validate: end time must be after start time
      if (input.endTime <= session.startTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      await ctx.db
        .update(sessions)
        .set({ endTime: input.endTime })
        .where(eq(sessions.id, input.sessionId));

      const durationMinutes = getDurationMinutes(session.startTime, input.endTime);

      return {
        sessionId: input.sessionId,
        endTime: input.endTime,
        durationMinutes,
      };
    }),

  // Get active session for current user
  active: protectedProcedure.query(async ({ ctx }) => {
    // If parent, they don't have sessions
    if (ctx.user.role === "parent") {
      return null;
    }

    const activeSession = await ctx.db.query.sessions.findFirst({
      where: and(
        eq(sessions.userId, ctx.user.id),
        isNull(sessions.endTime)
      ),
    });

    if (!activeSession) {
      return null;
    }

    const elapsedMinutes = getDurationMinutes(activeSession.startTime, new Date());

    return {
      id: activeSession.id,
      startTime: activeSession.startTime,
      originalStartTime: activeSession.originalStartTime ?? activeSession.startTime,
      elapsedMinutes,
      notes: activeSession.notes,
    };
  }),

  // List sessions with filtering
  list: protectedProcedure.input(sessionListQuerySchema).query(async ({ ctx, input }) => {
    // Build conditions
    const conditions = [eq(sessions.familyId, ctx.family.id)];

    // Children can only see their own sessions
    if (ctx.user.role === "child") {
      conditions.push(eq(sessions.userId, ctx.user.id));
    } else if (input.userId) {
      // Parents can filter by child
      conditions.push(eq(sessions.userId, input.userId));
    }

    if (input.startDate) {
      conditions.push(gte(sessions.startTime, input.startDate));
    }

    if (input.endDate) {
      conditions.push(lte(sessions.startTime, input.endDate));
    }

    const results = await ctx.db.query.sessions.findMany({
      where: and(...conditions),
      orderBy: desc(sessions.startTime),
      limit: input.limit,
      offset: input.offset,
    });

    return results.map((s) => ({
      ...s,
      durationMinutes: s.endTime
        ? getDurationMinutes(s.startTime, s.endTime)
        : getDurationMinutes(s.startTime, new Date()),
      isActive: s.endTime === null,
    }));
  }),

  // Add a manual session (for forgotten logging)
  manual: protectedProcedure.input(manualSessionSchema).mutation(async ({ ctx, input }) => {
    // Validate end time is after start time
    if (input.endTime <= input.startTime) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "End time must be after start time",
      });
    }

    // Children add for themselves, parents can specify a child
    const targetUserId = ctx.user.role === "child" ? ctx.user.id : ctx.user.id;

    const sessionId = generateId();
    const now = new Date();

    await ctx.db.insert(sessions).values({
      id: sessionId,
      userId: targetUserId,
      familyId: ctx.family.id,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes ?? null,
      isManual: true,
      createdAt: now,
    });

    return {
      sessionId,
      durationMinutes: getDurationMinutes(input.startTime, input.endTime),
      isManual: true,
    };
  }),

  // Delete a session
  delete: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.query.sessions.findFirst({
        where: eq(sessions.id, input.sessionId),
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // Children can only delete their own sessions
      if (ctx.user.role === "child" && session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own sessions",
        });
      }

      // Parents can delete any family session
      if (session.familyId !== ctx.family.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Session not in your family",
        });
      }

      await ctx.db.delete(sessions).where(eq(sessions.id, input.sessionId));

      return { success: true };
    }),
});
