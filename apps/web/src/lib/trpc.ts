import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// Import the router type from the API package
import type { AppRouter } from "@vg-log/api/trpc";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient(getAuth: () => { userId: string; familyId: string } | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: import.meta.env.VITE_API_URL || "/trpc",
        transformer: superjson,
        headers() {
          const auth = getAuth();
          if (auth) {
            return {
              "x-user-id": auth.userId,
              "x-family-id": auth.familyId,
            };
          }
          return {};
        },
      }),
    ],
  });
}
