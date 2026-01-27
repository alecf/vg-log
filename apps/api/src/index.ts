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
};

type Variables = {
  db: ReturnType<typeof createDb>;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS configuration
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow localhost for development
      if (origin?.includes("localhost") || origin?.includes("127.0.0.1")) {
        return origin;
      }
      // Allow cloudflare pages domains
      if (origin?.includes(".pages.dev") || origin?.includes(".workers.dev")) {
        return origin;
      }
      // Allow custom domain (configure this for production)
      return origin ?? "";
    },
    credentials: true,
  })
);

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
