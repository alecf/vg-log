import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers/index.js";
import { createDb } from "./db/index.js";
import { users, families } from "./db/schema.js";
import type { Context } from "./lib/trpc.js";

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
};

type Variables = {
  db: ReturnType<typeof createDb>;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS configuration
app.use("*", async (c, next) => {
  const allowedOrigins = (c.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const isDev = c.env.ENVIRONMENT === "development";

  return cors({
    origin: (origin) => {
      if (!origin) return "";

      let hostname: string;
      try {
        hostname = new URL(origin).hostname;
      } catch {
        return "";
      }

      // Allow localhost only in development
      if (isDev && (hostname === "localhost" || hostname === "127.0.0.1")) {
        return origin;
      }

      // Check against allowed origins list
      // Entries starting with "." match as suffix (e.g., ".pages.dev" matches "foo.pages.dev")
      // Other entries must match exactly
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed.startsWith(".")) {
          return hostname.endsWith(allowed) || hostname === allowed.slice(1);
        }
        return hostname === allowed;
      });

      return isAllowed ? origin : "";
    },
    credentials: true,
  })(c, next);
});

// Initialize DB middleware
app.use("*", async (c, next) => {
  const db = createDb(c.env.DB);
  c.set("db", db);
  await next();
});

// Health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", service: "vg-log-api" });
});

// tRPC endpoint
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (_opts, c): Promise<Context> => {
      const db = c.get("db");

      // Get user from header (simple auth - in production, use proper JWT/session)
      const userId = c.req.header("x-user-id");
      const familyId = c.req.header("x-family-id");

      let user = null;
      let family = null;

      if (userId && familyId) {
        user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (user) {
          family = await db.query.families.findFirst({
            where: eq(families.id, familyId),
          });
        }
      }

      return {
        db,
        user: user ?? null,
        family: family ?? null,
      };
    },
  })
);

export default app;
