import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl" | "round";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-base btn-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
  secondary: "btn-base btn-secondary hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
  ghost: "btn-ghost hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
  danger: "btn-base bg-exceeded text-primary-foreground rounded-lg p-3 hover:bg-exceeded/90 disabled:opacity-50 disabled:cursor-not-allowed",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-sm px-2 py-1 min-h-[36px]",
  md: "text-base px-3 py-2",
  lg: "text-lg px-4 py-3",
  xl: "text-xl px-6 py-4",
  round: "rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
