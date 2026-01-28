import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button, Card } from "@/components";

export const Route = createFileRoute("/family")({
  component: Family,
});

function Family() {
  const { isAuthenticated, user, family } = useAuthStore();
  const [showChildCode, setShowChildCode] = useState(false);
  const [showParentCode, setShowParentCode] = useState(false);
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<"child" | "parent" | null>(null);

  const { data: members, isLoading } = trpc.family.members.useQuery();
  const { data: inviteCodes, refetch: refetchCodes } = trpc.family.inviteCodes.useQuery(undefined, {
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

  const toggleLockdown = trpc.family.toggleLockdown.useMutation({
    onSuccess: () => {
      refetchCodes();
    },
  });

  const regenerateCode = trpc.family.regenerateInviteCode.useMutation({
    onSuccess: () => {
      refetchCodes();
      setConfirmRegenerate(null);
    },
  });

  const kickMember = trpc.family.kickMember.useMutation({
    onSuccess: () => {
      utils.family.members.invalidate();
      setConfirmKick(null);
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
      <Card>
        <h2 className="font-semibold mb-2">Family</h2>
        <p className="text-lg">{family?.name}</p>
      </Card>

      {/* Lockdown toggle */}
      {inviteCodes && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Family Lockdown</h2>
              <p className="text-sm text-muted-foreground">
                {inviteCodes.isLocked
                  ? "New members cannot join"
                  : "New members can join with invite codes"}
              </p>
            </div>
            <button
              onClick={() => toggleLockdown.mutate({ locked: !inviteCodes.isLocked })}
              disabled={toggleLockdown.isPending}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                inviteCodes.isLocked ? "bg-exceeded" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  inviteCodes.isLocked ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </Card>
      )}

      {/* Invite codes */}
      <Card className="space-y-4">
        <h2 className="font-semibold">Invite Codes</h2>
        <p className="text-sm text-muted-foreground">
          Share these codes with family members to let them join
        </p>

        {/* Child invite code */}
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Child Invite Code</p>
            {confirmRegenerate === "child" ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => regenerateCode.mutate({ codeType: "child" })}
                  disabled={regenerateCode.isPending}
                  className="text-exceeded"
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRegenerate(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRegenerate("child")}
              >
                Regenerate
              </Button>
            )}
          </div>
          {showChildCode ? (
            <div className="flex items-center gap-4">
              <p className="text-2xl font-mono font-bold tracking-wider flex-1">
                {inviteCodes?.childCode}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigator.clipboard.writeText(inviteCodes?.childCode ?? "")}
              >
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChildCode(false)}
              >
                Hide
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setShowChildCode(true)}>
              Show Code
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-2">Share with your kids</p>
        </div>

        {/* Parent invite code */}
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Parent Invite Code</p>
            {confirmRegenerate === "parent" ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => regenerateCode.mutate({ codeType: "parent" })}
                  disabled={regenerateCode.isPending}
                  className="text-exceeded"
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRegenerate(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRegenerate("parent")}
              >
                Regenerate
              </Button>
            )}
          </div>
          {showParentCode ? (
            <div className="flex items-center gap-4">
              <p className="text-2xl font-mono font-bold tracking-wider flex-1">
                {inviteCodes?.parentCode}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigator.clipboard.writeText(inviteCodes?.parentCode ?? "")}
              >
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowParentCode(false)}
              >
                Hide
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setShowParentCode(true)}>
              Show Code
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-2">Share with other parents only</p>
        </div>
      </Card>

      {/* Members list */}
      <Card>
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
                      {confirmKick === child.id ? (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => kickMember.mutate({ userId: child.id })}
                            disabled={kickMember.isPending}
                            className="text-exceeded"
                          >
                            Confirm Remove
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmKick(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmKick(child.id)}
                        >
                          Remove
                        </Button>
                      )}
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
      </Card>

      {/* Notification preferences */}
      <Card>
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
      </Card>
    </div>
  );
}
