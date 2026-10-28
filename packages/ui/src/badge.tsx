import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger";
}

const variants = {
  default: "border-[#382D4B] text-[#B9B0C9] bg-[#231C32]/60",
  success: "border-[#54D6A0]/70 text-[#54D6A0] bg-[#54D6A0]/10",
  warning: "border-[#FFD66B]/70 text-[#FFD66B] bg-[#FFD66B]/10",
  danger: "border-[#FF647C]/70 text-[#FF647C] bg-[#FF647C]/10",
};

export const Badge = ({ className = "", variant = "default", ...props }: BadgeProps) => {
  return <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-full border ${variants[variant]} ${className}`} {...props} />;
};
