import { createRootRoute, Outlet, Link } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { useAuthStore } from "@/stores/auth";
import { useTimerStore } from "@/stores/timer";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

function RootLayout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { activeSession, elapsedSeconds, remainingSeconds, alertState } =
    useTimerStore();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="text-xl font-bold text-primary">
            VG-Log
          </Link>

          {isAuthenticated && (
            <div className="flex items-center gap-4">
              {/* Active timer indicator */}
              {activeSession && (
                <div
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-mono",
                    alertState === "ok" && "bg-ok/20 text-ok",
                    alertState === "warning" && "bg-warning/20 text-warning",
                    alertState === "urgent" && "bg-urgent/20 text-urgent animate-pulse",
                    alertState === "exceeded" && "bg-exceeded/20 text-exceeded animate-pulse"
                  )}
                >
                  {formatTime(elapsedSeconds)}
                  {remainingSeconds !== null && (
                    <span className="ml-2 text-xs opacity-75">
                      ({remainingSeconds >= 0 ? formatTime(remainingSeconds) : formatTime(remainingSeconds)} left)
                    </span>
                  )}
                </div>
              )}

              <span className="text-sm text-muted-foreground">{user?.name}</span>
              <button
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      {isAuthenticated && (
        <nav className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-4xl gap-1 px-4 py-2">
            <NavLink to="/">Dashboard</NavLink>
            {user?.role === "child" && <NavLink to="/play">Play</NavLink>}
            <NavLink to="/calendar">Calendar</NavLink>
            <NavLink to="/summary">Summary</NavLink>
            {user?.role === "parent" && (
              <>
                <NavLink to="/limits">Limits</NavLink>
                <NavLink to="/family">Family</NavLink>
              </>
            )}
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-4xl p-4">
        <Outlet />
      </main>

      {/* Dev tools */}
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&.active]:bg-primary/10 [&.active]:text-primary"
    >
      {children}
    </Link>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
