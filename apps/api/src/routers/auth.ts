import { TRPCError } from "@trpc/server";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../lib/trpc.js";
import { users, families } from "../db/schema.js";

export const authRouter = router({
  // Login with user ID and PIN
  login: publicProcedure
    .input(
      z.object({
        oderId: z.string().uuid(),
        pin: z.string().length(4).regex(/^\d{4}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: and(eq(users.id, input.oderId), eq(users.pin, input.pin)),
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const family = await ctx.db.query.families.findFirst({
        where: eq(families.id, user.familyId),
      });

      if (!family) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Family not found",
        });
      }

      // Return user data for client-side session storage
      return {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          familyId: user.familyId,
        },
        family: {
          id: family.id,
          name: family.name,
          timezone: family.timezone,
        },
      };
    }),

  // Get family members for login selection
  getFamilyMembers: publicProcedure
    .input(z.object({ inviteCode: z.string().length(6) }))
    .query(async ({ ctx, input }) => {
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
          message: "Family not found",
        });
      }

      // Determine which code type was used
      const codeType = family.childInviteCode === upperCode ? "child" : "parent";

      // Note: Do NOT check isLocked here - existing users need to log in even when locked

      const members = await ctx.db.query.users.findMany({
        where: eq(users.familyId, family.id),
      });

      return {
        familyName: family.name,
        codeType,
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
        })),
      };
    }),

  // Get current authenticated user
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        role: ctx.user.role,
        familyId: ctx.user.familyId,
      },
      family: {
        id: ctx.family.id,
        name: ctx.family.name,
        timezone: ctx.family.timezone,
      },
    };
  }),
});
