import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../lib/trpc.js";
import { families, users, alertSettings, notificationPreferences } from "../db/schema.js";
import { generateId, generateInviteCode } from "../lib/utils.js";
import { createFamilySchema, joinFamilySchema } from "@vg-log/shared";

export const familyRouter = router({
  // Create a new family (parent only)
  create: publicProcedure
    .input(
      createFamilySchema.extend({
        parentName: z.string().min(1).max(100),
        parentEmail: z.string().email().optional(),
        parentPin: z.string().length(4).regex(/^\d{4}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const familyId = generateId();
      const oderId = generateId();
      const inviteCode = generateInviteCode();
      const now = new Date();

      // Create family
      await ctx.db.insert(families).values({
        id: familyId,
        name: input.name,
        inviteCode,
        timezone: input.timezone,
        createdAt: now,
      });

      // Create parent user
      await ctx.db.insert(users).values({
        id: oderId,
        familyId,
        name: input.parentName,
        role: "parent",
        pin: input.parentPin,
        email: input.parentEmail ?? null,
        createdAt: now,
      });

      // Create default notification preferences for parent
      await ctx.db.insert(notificationPreferences).values({
        id: generateId(),
        userId: oderId,
        browserNotifications: true,
        inAppBanner: true,
        emailNotifications: false,
      });

      return {
        familyId,
        oderId,
        inviteCode,
      };
    }),

  // Join an existing family
  join: publicProcedure.input(joinFamilySchema).mutation(async ({ ctx, input }) => {
    // Find family by invite code
    const family = await ctx.db.query.families.findFirst({
      where: eq(families.inviteCode, input.inviteCode.toUpperCase()),
    });

    if (!family) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid invite code",
      });
    }

    const oderId = generateId();
    const now = new Date();

    // Create user
    await ctx.db.insert(users).values({
      id: oderId,
      familyId: family.id,
      name: input.name,
      role: input.role,
      pin: input.pin ?? null,
      email: null,
      createdAt: now,
    });

    // Create default alert settings for children
    if (input.role === "child") {
      await ctx.db.insert(alertSettings).values({
        id: generateId(),
        userId: oderId,
        warningMinutes: 15,
        urgentMinutes: 5,
        soundEnabled: true,
      });
    }

    // Create default notification preferences for parents
    if (input.role === "parent") {
      await ctx.db.insert(notificationPreferences).values({
        id: generateId(),
        userId: oderId,
        browserNotifications: true,
        inAppBanner: true,
        emailNotifications: false,
      });
    }

    return {
      familyId: family.id,
      oderId,
      familyName: family.name,
    };
  }),

  // Get current family details
  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.family;
  }),

  // List all family members
  members: protectedProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.query.users.findMany({
      where: eq(users.familyId, ctx.family.id),
    });

    return members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      isCurrentUser: member.id === ctx.user.id,
      createdAt: member.createdAt,
    }));
  }),

  // Get invite code (parents only can see this)
  inviteCode: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "parent") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only parents can view the invite code",
      });
    }
    return ctx.family.inviteCode;
  }),
});
