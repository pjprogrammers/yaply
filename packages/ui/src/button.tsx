import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "coral";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const base = "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B69AFF]/80 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-[#9B6DFF] to-[#7C3AED] hover:from-[#B69AFF] hover:to-[#8B5CF6] text-white shadow-[0_10px_60px_-20px_rgba(155,109,255,0.9)]",
  secondary: "bg-[#231C32] border border-[#382D4B] hover:bg-[#2D2440] text-[#F7F4FC]",
  outline: "border border-[#382D4B] bg-transparent hover:bg-[#231C32] text-[#F7F4FC]",
  ghost: "hover:bg-[#231C32] text-[#B9B0C9] hover:text-[#F7F4FC]",
  destructive: "bg-[#FF647C] hover:bg-[#FF6B70] text-white",
  coral: "bg-gradient-to-r from-[#FF6B70] to-[#FB7185] hover:from-[#FF7C81] hover:to-[#F43F5E] text-white",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? "Loading..." : children}
      </button>
    );
  }
);

Button.displayName = "Button";
