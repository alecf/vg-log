import { router } from "../lib/trpc.js";
import { familyRouter } from "./family.js";
import { authRouter } from "./auth.js";
import { sessionRouter } from "./session.js";
import { limitRouter } from "./limit.js";
import { statsRouter } from "./stats.js";
import { notificationRouter } from "./notification.js";

export const appRouter = router({
  family: familyRouter,
  auth: authRouter,
  session: sessionRouter,
  limit: limitRouter,
  stats: statsRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
