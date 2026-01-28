import { TRPCError } from "@trpc/server";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import { router, publicProcedure, protectedProcedure, parentProcedure } from "../lib/trpc.js";
import { families, users, alertSettings, notificationPreferences } from "../db/schema.js";
import { generateId, generateInviteCode } from "../lib/utils.js";
import {
  createFamilySchema,
  joinFamilySchema,
  regenerateInviteCodeSchema,
  kickUserSchema,
  toggleLockdownSchema,
} from "@vg-log/shared";

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
      const childInviteCode = generateInviteCode();
      const parentInviteCode = generateInviteCode();
      const now = new Date();

      // Create family
      await ctx.db.insert(families).values({
        id: familyId,
        name: input.name,
        childInviteCode,
        parentInviteCode,
        isLocked: false,
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
        childInviteCode,
        parentInviteCode,
      };
    }),

  // Join an existing family
  join: publicProcedure.input(joinFamilySchema).mutation(async ({ ctx, input }) => {
    const upperCode = input.inviteCode.toUpperCase();

    // Find family by either invite code
    const family = await ctx.db.query.families.findFirst({
      where: or(
        eq(families.childInviteCode, upperCode),
        eq(families.parentInviteCode, upperCode)
      ),
    });

    if (!family) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid invite code",
      });
    }

    // Check if family is locked
    if (family.isLocked) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This family is not accepting new members",
      });
    }

    // Determine which code type was used
    const isChildCode = family.childInviteCode === upperCode;
    const isParentCode = family.parentInviteCode === upperCode;

    // Validate that the requested role matches the code type
    if (isChildCode && input.role !== "child") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This invite code is for children only",
      });
    }
    if (isParentCode && input.role !== "parent") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This invite code is for parents only",
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

  // Get invite codes (parents only)
  inviteCodes: parentProcedure.query(async ({ ctx }) => {
    return {
      childCode: ctx.family.childInviteCode,
      parentCode: ctx.family.parentInviteCode,
      isLocked: ctx.family.isLocked,
    };
  }),

  // Toggle family lockdown (parents only)
  toggleLockdown: parentProcedure
    .input(toggleLockdownSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(families)
        .set({ isLocked: input.locked })
        .where(eq(families.id, ctx.family.id));

      return { isLocked: input.locked };
    }),

  // Regenerate an invite code (parents only)
  regenerateInviteCode: parentProcedure
    .input(regenerateInviteCodeSchema)
    .mutation(async ({ ctx, input }) => {
      const newCode = generateInviteCode();

      if (input.codeType === "child") {
        await ctx.db
          .update(families)
          .set({ childInviteCode: newCode })
          .where(eq(families.id, ctx.family.id));
      } else {
        await ctx.db
          .update(families)
          .set({ parentInviteCode: newCode })
          .where(eq(families.id, ctx.family.id));
      }

      return { newCode, codeType: input.codeType };
    }),

  // Kick a child from the family (parents only)
  kickMember: parentProcedure
    .input(kickUserSchema)
    .mutation(async ({ ctx, input }) => {
      // Find the user to kick
      const userToKick = await ctx.db.query.users.findFirst({
        where: and(
          eq(users.id, input.userId),
          eq(users.familyId, ctx.family.id)
        ),
      });

      if (!userToKick) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in this family",
        });
      }

      // Only allow kicking children
      if (userToKick.role !== "child") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only children can be removed from the family",
        });
      }

      // Delete the user (cascades to sessions, limits, alerts)
      await ctx.db.delete(users).where(eq(users.id, input.userId));

      return { success: true };
    }),
});
