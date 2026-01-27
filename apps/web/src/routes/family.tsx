import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/family")({
  component: Family,
});

function Family() {
  const { isAuthenticated, user, family } = useAuthStore();
  const [showCode, setShowCode] = useState(false);

  const { data: members, isLoading } = trpc.family.members.useQuery();
  const { data: inviteCode } = trpc.family.inviteCode.useQuery(undefined, {
    enabled: user?.role === "parent",
  });
  const { data: notifPrefs } = trpc.notification.getPreferences.useQuery(undefined, {
    enabled: user?.role === "parent",
  });

  const utils = trpc.useUtils();
  const updatePrefs = trpc.notification.updatePreferences.useMutation({
    onSuccess: () => {
      utils.notification.getPreferences.invalidate();
    },
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== "parent") {
    return <Navigate to="/" />;
  }

  const parents = members?.filter((m) => m.role === "parent") ?? [];
  const children = members?.filter((m) => m.role === "child") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Family Settings</h1>

      {/* Family info */}
      <div className="rounded-xl bg-card p-4">
        <h2 className="font-semibold mb-2">Family</h2>
        <p className="text-lg">{family?.name}</p>
      </div>

      {/* Invite code */}
      <div className="rounded-xl bg-card p-4">
        <h2 className="font-semibold mb-2">Invite Code</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Share this code with family members to let them join
        </p>

        {showCode ? (
          <div className="flex items-center gap-4">
            <p className="text-3xl font-mono font-bold tracking-wider flex-1">
              {inviteCode}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteCode ?? "");
              }}
              className="rounded-lg bg-muted px-4 py-2 text-sm hover:bg-muted/80"
            >
              Copy
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCode(true)}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Show Code
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="rounded-xl bg-card p-4">
        <h2 className="font-semibold mb-4">Family Members</h2>

        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Parents */}
            <div>
              <h3 className="text-sm text-muted-foreground mb-2">Parents</h3>
              <div className="space-y-2">
                {parents.map((parent) => (
                  <div
                    key={parent.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg bg-muted/50 p-3",
                      parent.isCurrentUser && "ring-1 ring-primary"
                    )}
                  >
                    <div>
                      <p className="font-medium">{parent.name}</p>
                      {parent.isCurrentUser && (
                        <p className="text-xs text-primary">You</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Children */}
            <div>
              <h3 className="text-sm text-muted-foreground mb-2">Children</h3>
              {children.length > 0 ? (
                <div className="space-y-2">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <p className="font-medium">{child.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No children have joined yet
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notification preferences */}
      <div className="rounded-xl bg-card p-4">
        <h2 className="font-semibold mb-2">Notification Preferences</h2>
        <p className="text-sm text-muted-foreground mb-4">
          How would you like to be notified when a child exceeds their limit?
        </p>

        {notifPrefs && (
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg bg-muted/50 p-3 cursor-pointer">
              <span>Browser Notifications</span>
              <input
                type="checkbox"
                checked={notifPrefs.browserNotifications}
                onChange={(e) =>
                  updatePrefs.mutate({
                    ...notifPrefs,
                    browserNotifications: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg bg-muted/50 p-3 cursor-pointer">
              <span>In-App Banner</span>
              <input
                type="checkbox"
                checked={notifPrefs.inAppBanner}
                onChange={(e) =>
                  updatePrefs.mutate({
                    ...notifPrefs,
                    inAppBanner: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg bg-muted/50 p-3 cursor-pointer opacity-50">
              <div>
                <span>Email Notifications</span>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
              <input
                type="checkbox"
                checked={false}
                disabled
                className="w-5 h-5 accent-primary"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
