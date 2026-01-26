import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { trpc, createTRPCClient } from "./lib/trpc";
import { useAuthStore } from "./stores/auth";
import "./index.css";

// Create the router
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: true,
    },
  },
});

// Create tRPC client with auth
function App() {
  const getAuth = () => {
    const state = useAuthStore.getState();
    if (state.user && state.family) {
      return {
        userId: state.user.id,
        familyId: state.family.id,
      };
    }
    return null;
  };

  const trpcClient = React.useMemo(() => createTRPCClient(getAuth), []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
