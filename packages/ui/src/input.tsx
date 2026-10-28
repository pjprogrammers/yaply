import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const base = "w-full px-4 py-3 rounded-xl bg-[#191424]/80 border border-[#382D4B] text-[#F7F4FC] placeholder:text-[#898097] focus:outline-none focus:border-[#B69AFF]/80 transition";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className = "", ...props }, ref) => {
  return <input ref={ref} className={`${base} ${className}`} {...props} />;
});

Input.displayName = "Input";
