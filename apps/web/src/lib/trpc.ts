import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// Import the router type from the API package
import type { AppRouter } from "@vg-log/api/trpc";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient(getAuth: () => { userId: string; familyId: string } | null) {
  return trpc.createClient({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: "/trpc",
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
