import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/lib/trpc";
import { formatDuration, cn } from "@/lib/utils";
import { Button, Card } from "@/components";

export const Route = createFileRoute("/calendar")({
  component: Calendar,
});

function Calendar() {
  const { isAuthenticated, user } = useAuthStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // For parents, fetch family members to select a child
  const { data: members } = trpc.family.members.useQuery(undefined, {
    enabled: user?.role === "parent",
  });

  const children = members?.filter((m) => m.role === "child") ?? [];

  // Determine which user's data to show
  // For children: show their own data
  // For parents: show selected child's data (or first child if none selected)
  const targetUserId =
    user?.role === "child"
      ? undefined // API will use logged-in user
      : selectedChildId ?? children[0]?.id;

  const { data: calendar, isLoading } = trpc.stats.calendar.useQuery(
    {
      year,
      month,
      userId: targetUserId,
    },
    {
      // Only fetch when we have a target user (always true for children, need child selected for parents)
      enabled: user?.role === "child" || !!targetUserId,
    }
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDay(null);
  };

  // Get first day of month (0 = Sunday)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Create calendar grid
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  // Add empty cells for days before the first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    currentWeek.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Add remaining empty cells
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const getDayData = (day: number) => {
    return calendar?.days.find((d) => new Date(d.date).getDate() === day);
  };

  const getDayColor = (day: number) => {
    const data = getDayData(day);
    if (!data || data.totalMinutes === 0) return "bg-muted/30";
    if (data.isOverLimit) return "bg-exceeded/50";
    if (data.totalMinutes > 120) return "bg-warning/50"; // > 2 hours
    if (data.totalMinutes > 60) return "bg-ok/30"; // > 1 hour
    return "bg-ok/20";
  };

  const selectedDayData = selectedDay ? getDayData(selectedDay) : null;
  const selectedChild = children.find((c) => c.id === (selectedChildId ?? children[0]?.id));

  return (
    <div className="space-y-6">
      {/* Child selector for parents */}
      {user?.role === "parent" && children.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map((child) => (
            <Button
              key={child.id}
              variant={(selectedChildId ?? children[0]?.id) === child.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedChildId(child.id)}
              className="whitespace-nowrap"
            >
              {child.name}
            </Button>
          ))}
        </div>
      )}

      {/* No children message for parents */}
      {user?.role === "parent" && children.length === 0 && (
        <Card padding="lg" className="text-center">
          <p className="text-muted-foreground">No children in your family yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Share your family code to invite them.
          </p>
        </Card>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={goToPrevMonth}>
          &larr;
        </Button>
        <h1 className="text-xl font-semibold">
          {selectedChild ? `${selectedChild.name}'s ` : ""}
          {monthNames[month - 1]} {year}
        </h1>
        <Button variant="secondary" size="sm" onClick={goToNextMonth}>
          &rarr;
        </Button>
      </div>

      {/* Month summary */}
      {calendar && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-sm text-muted-foreground">Total this month</p>
            <p className="text-2xl font-bold font-mono">
              {formatDuration(calendar.totalMonthMinutes)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted-foreground">Sessions</p>
            <p className="text-2xl font-bold">{calendar.totalSessions}</p>
          </Card>
        </div>
      )}

      {/* Calendar grid */}
      <Card>
        {isLoading ? (
          <div className="h-64 animate-pulse bg-muted rounded" />
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs text-muted-foreground font-medium py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIndex) => (
                    <button
                      key={dayIndex}
                      onClick={() => day && setSelectedDay(day)}
                      disabled={!day}
                      className={cn(
                        "aspect-square rounded-lg flex items-center justify-center text-sm transition-all",
                        day ? getDayColor(day) : "bg-transparent",
                        day && "hover:ring-2 hover:ring-primary",
                        selectedDay === day && "ring-2 ring-primary"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted/30" />
          <span>No gaming</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-ok/20" />
          <span>&lt; 1 hour</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-ok/30" />
          <span>1-2 hours</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-warning/50" />
          <span>&gt; 2 hours</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-exceeded/50" />
          <span>Over limit</span>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <Card>
          <h3 className="font-semibold mb-2">
            {monthNames[month - 1]} {selectedDay}, {year}
          </h3>
          {selectedDayData && selectedDayData.totalMinutes > 0 ? (
            <div className="space-y-2">
              <p className="text-2xl font-bold font-mono">
                {formatDuration(selectedDayData.totalMinutes)}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedDayData.sessionCount} session
                {selectedDayData.sessionCount !== 1 ? "s" : ""}
              </p>
              {selectedDayData.isOverLimit && (
                <p className="text-sm text-exceeded">Over daily average</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No gaming this day</p>
          )}
        </Card>
      )}
    </div>
  );
}
