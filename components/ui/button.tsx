import { type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function ActionButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[14px] border px-[18px] py-3 text-[0.95rem] font-bold transition duration-200 disabled:cursor-not-allowed disabled:shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
