import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardPadding = "default" | "lg" | "none";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  selected?: boolean;
  highlighted?: boolean;
  variant?: "default" | "alert" | "success" | "muted";
}

const paddingClasses: Record<CardPadding, string> = {
  default: "p-4",
  lg: "p-6",
  none: "",
};

const variantClasses: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "bg-card",
  alert: "bg-exceeded/10 border border-exceeded/20",
  success: "bg-ok/10 border border-ok/20",
  muted: "bg-muted/50",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      padding = "default",
      selected = false,
      highlighted = false,
      variant = "default",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl",
          variantClasses[variant],
          paddingClasses[padding],
          selected && "border-2 border-primary",
          highlighted && "border border-primary/20",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between mb-3", className)}
        {...props}
      >
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";
