import {
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

export function FieldCard({
  className,
  compact = false,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border border-slate-500/20 bg-slate-50/90",
        compact && "rounded-[14px] p-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function FieldRow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function FieldCopy({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function FieldHeading({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function FieldTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("text-[0.86rem] font-bold", className)} {...props}>
      {children}
    </span>
  );
}

export function FieldDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-[0.78rem] leading-[1.45] text-slate-500", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function RangeInput({
  className,
  type = "range",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-1 w-full appearance-none rounded-full bg-[rgba(96,113,125,0.2)] outline-none [&::-webkit-slider-thumb]:h-[15px] [&::-webkit-slider-thumb]:w-[15px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-700 [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(15,118,110,0.14)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-[15px] [&::-moz-range-thumb]:w-[15px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-teal-700 [&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(15,118,110,0.14)] [&::-moz-range-thumb]:cursor-pointer",
        className,
      )}
      type={type}
      {...props}
    />
  );
}

export function ToggleCard({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer select-none items-center justify-between gap-3 border border-slate-500/20 bg-slate-50/90 px-3 py-[10px]",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function ToggleTrack({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full bg-[rgba(96,113,125,0.26)] transition-colors duration-200",
        checked && "bg-teal-700",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-[0_2px_5px_rgba(19,35,43,0.2)] transition-transform duration-200",
          checked && "translate-x-4",
        )}
      />
    </span>
  );
}
