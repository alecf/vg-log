import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "-" : "";

  if (hours === 0) {
    return `${sign}${mins}m`;
  }

  if (mins === 0) {
    return `${sign}${hours}h`;
  }

  return `${sign}${hours}h ${mins}m`;
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(Math.abs(seconds) / 3600);
  const minutes = Math.floor((Math.abs(seconds) % 3600) / 60);
  const secs = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? "-" : "";

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${sign}${hours}:${pad(minutes)}:${pad(secs)}`;
  }

  return `${sign}${minutes}:${pad(secs)}`;
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function toTimeInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromTimeInputValue(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
