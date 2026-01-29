import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputVariant = "default" | "pin" | "centered";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  hint?: string;
}

const variantClasses: Record<InputVariant, string> = {
  default: "input-base focus:outline-none focus:ring-2 focus:ring-primary",
  pin: "input-base input-pin focus:outline-none focus:ring-2 focus:ring-primary",
  centered: "input-base text-center text-xl focus:outline-none focus:ring-2 focus:ring-primary",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "default", label, error, hint, id, name, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const inputName = name || inputId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium mb-1"
          >
            {label}
          </label>
        )}
        {hint && (
          <p className="text-xs text-muted-foreground mb-2">{hint}</p>
        )}
        <input
          ref={ref}
          id={inputId}
          name={inputName}
          className={cn(
            variantClasses[variant],
            error && "border-exceeded focus:ring-exceeded",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-exceeded mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
