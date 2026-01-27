import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Database } from "../db/index.js";
import type { User, Family } from "../db/schema.js";

export interface Context extends Record<string, unknown> {
  db: Database;
  user: User | null;
  family: Family | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware that requires authentication
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.family) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      family: ctx.family,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Middleware that requires parent role
const isParent = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.family) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  if (ctx.user.role !== "parent") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only parents can access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      family: ctx.family,
    },
  });
});

export const parentProcedure = t.procedure.use(isParent);

// Middleware that requires child role
const isChild = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.family) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  if (ctx.user.role !== "child") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only children can access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      family: ctx.family,
    },
  });
});

export const childProcedure = t.procedure.use(isChild);
