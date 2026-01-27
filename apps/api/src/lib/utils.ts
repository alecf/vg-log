// Generate a random UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Generate a 6-character invite code
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get start of week (Monday) for a given date in a timezone
export function getWeekStart(date: Date, timezone: string): Date {
  const localDate = new Date(
    date.toLocaleString("en-US", { timeZone: timezone })
  );
  const day = localDate.getDay();
  const diff = localDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday
  const weekStart = new Date(localDate);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

// Get end of week (Sunday 23:59:59) for a given date in a timezone
export function getWeekEnd(date: Date, timezone: string): Date {
  const weekStart = getWeekStart(date, timezone);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

// Get start of day in a timezone
export function getDayStart(date: Date, timezone: string): Date {
  const localDate = new Date(
    date.toLocaleString("en-US", { timeZone: timezone })
  );
  localDate.setHours(0, 0, 0, 0);
  return localDate;
}

// Get end of day in a timezone
export function getDayEnd(date: Date, timezone: string): Date {
  const localDate = new Date(
    date.toLocaleString("en-US", { timeZone: timezone })
  );
  localDate.setHours(23, 59, 59, 999);
  return localDate;
}

// Calculate duration in minutes between two dates
export function getDurationMinutes(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

// Determine alert state based on remaining minutes
export function getAlertState(
  remainingMinutes: number,
  warningThreshold: number = 15,
  urgentThreshold: number = 5
): "ok" | "warning" | "urgent" | "exceeded" {
  if (remainingMinutes <= 0) return "exceeded";
  if (remainingMinutes <= urgentThreshold) return "urgent";
  if (remainingMinutes <= warningThreshold) return "warning";
  return "ok";
}

// Check if a date is a weekend day
export function isWeekend(date: Date, timezone: string): boolean {
  const localDate = new Date(
    date.toLocaleString("en-US", { timeZone: timezone })
  );
  const day = localDate.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}
