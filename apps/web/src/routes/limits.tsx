import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { formatDuration, cn } from "@/lib/utils";
import { Button, Card, Input, ProgressBar } from "@/components";

export const Route = createFileRoute("/limits")({
  component: Limits,
});

function Limits() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== "parent") {
    return <Navigate to="/" />;
  }

  return <LimitsContent />;
}

function LimitsContent() {
  const utils = trpc.useUtils();
  const { data: members, isLoading: membersLoading, error: membersError } = trpc.family.members.useQuery();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(0);

  // All hooks must be called unconditionally before any early returns
  const { data: childLimits } = trpc.limit.get.useQuery(
    { userId: selectedChildId ?? undefined },
    { enabled: !!selectedChildId }
  );

  const { data: childStats } = trpc.stats.overview.useQuery(
    { userId: selectedChildId ?? undefined },
    { enabled: !!selectedChildId }
  );

  const setLimit = trpc.limit.set.useMutation({
    onSuccess: () => {
      utils.limit.get.invalidate();
      utils.stats.familyOverview.invalidate();
    },
  });

  const children = members?.filter((m) => m.role === "child") ?? [];

  if (membersLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Time Limits</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-16" />
            ))}
          </div>
          <Card className="h-48" />
        </div>
      </div>
    );
  }

  if (membersError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Time Limits</h1>
        <Card variant="alert" padding="lg" className="text-center">
          <p className="text-exceeded font-medium">Failed to load family members</p>
          <p className="text-sm text-muted-foreground mt-1">{membersError.message}</p>
        </Card>
      </div>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const currentWeeklyLimit = childLimits?.find((l) => l.limitType === "weekly");

  const handleSetLimit = () => {
    if (!selectedChildId) return;
    setLimit.mutate({
      userId: selectedChildId,
      limitType: "weekly",
      minutes: hours * 60 + minutes,
    });
  };

  // Preset options
  const presets = [
    { label: "5 hours", hours: 5, minutes: 0 },
    { label: "7 hours", hours: 7, minutes: 0 },
    { label: "10 hours", hours: 10, minutes: 0 },
    { label: "14 hours", hours: 14, minutes: 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Time Limits</h1>

      {children.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-muted-foreground">No children in your family yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Share your family code to invite them.
          </p>
        </Card>
      ) : (
        <>
          {/* Child selector */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => {
                  setSelectedChildId(child.id);
                  // Load current limit into inputs
                  const limit = childLimits?.find((l) => l.limitType === "weekly");
                  if (limit) {
                    setHours(Math.floor(limit.minutes / 60));
                    setMinutes(limit.minutes % 60);
                  }
                }}
                className={cn(
                  "rounded-xl p-4 text-left transition",
                  selectedChildId === child.id
                    ? "bg-primary/20 border-2 border-primary"
                    : "bg-card border-2 border-transparent hover:border-muted"
                )}
              >
                <p className="font-medium">{child.name}</p>
              </button>
            ))}
          </div>

          {selectedChildId && selectedChild && (
            <>
              {/* Current stats */}
              {childStats && (
                <Card>
                  <h3 className="font-medium mb-2">{selectedChild.name}'s Week</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {formatDuration(childStats.weeklyMinutes)}
                    </span>
                    {childStats.weeklyLimitMinutes !== null && (
                      <span className="text-muted-foreground">
                        / {formatDuration(childStats.weeklyLimitMinutes)}
                      </span>
                    )}
                  </div>
                  {childStats.weeklyLimitMinutes !== null && (
                    <ProgressBar
                      value={childStats.weeklyMinutes}
                      max={childStats.weeklyLimitMinutes}
                      alertState={childStats.isOverLimit ? "exceeded" : "ok"}
                      className="mt-2"
                    />
                  )}
                </Card>
              )}

              {/* Limit setter */}
              <Card className="space-y-4">
                <h3 className="font-medium">Set Weekly Limit</h3>

                {currentWeeklyLimit && (
                  <p className="text-sm text-muted-foreground">
                    Current limit: {formatDuration(currentWeeklyLimit.minutes)}
                  </p>
                )}

                {/* Presets */}
                <div className="grid grid-cols-4 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setHours(preset.hours);
                        setMinutes(preset.minutes);
                      }}
                      className={cn(
                        "rounded-lg p-2 text-sm border transition",
                        hours === preset.hours && minutes === preset.minutes
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom input */}
                <div className="flex items-center gap-4">
                  <Input
                    variant="centered"
                    label="Hours"
                    type="number"
                    min={0}
                    max={168}
                    value={hours}
                    onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                  />
                  <span className="text-2xl text-muted-foreground mt-6">:</span>
                  <Input
                    variant="centered"
                    label="Minutes"
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                  />
                </div>

                <p className="text-center text-lg">
                  = <span className="font-bold">{formatDuration(hours * 60 + minutes)}</span> per week
                </p>

                <Button
                  fullWidth
                  onClick={handleSetLimit}
                  disabled={setLimit.isPending || (hours === 0 && minutes === 0)}
                >
                  {setLimit.isPending ? "Saving..." : "Set Limit"}
                </Button>

                {setLimit.isSuccess && (
                  <p className="text-sm text-ok text-center">Limit updated!</p>
                )}

                {setLimit.error && (
                  <p className="text-sm text-exceeded text-center">{setLimit.error.message}</p>
                )}
              </Card>

              {/* Remove limit option */}
              {currentWeeklyLimit && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    // Set to 0 to effectively remove the limit (or could add delete mutation)
                    setHours(0);
                    setMinutes(0);
                  }}
                >
                  Remove limit
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
