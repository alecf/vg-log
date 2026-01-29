import { forwardRef, type HTMLAttributes } from "react";
import { cn, type AlertState } from "@/lib/utils";

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max: number;
  alertState?: AlertState | null;
  showLabels?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  size?: "sm" | "md";
}

const stateColorClasses: Record<AlertState, string> = {
  ok: "bg-ok",
  warning: "bg-warning",
  urgent: "bg-urgent",
  exceeded: "bg-exceeded",
};

const sizeClasses = {
  sm: "h-2",
  md: "h-3",
};

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value,
      max,
      alertState,
      showLabels = false,
      leftLabel,
      rightLabel,
      size = "sm",
      ...props
    },
    ref
  ) => {
    const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const colorClass = alertState ? stateColorClasses[alertState] : "bg-primary";

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {showLabels && (leftLabel || rightLabel) && (
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{leftLabel}</span>
            <span>{rightLabel}</span>
          </div>
        )}
        <div
          className={cn("progress-container", sizeClasses[size])}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={cn("progress-fill", colorClass)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";
