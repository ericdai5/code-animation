import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type PanelTag = "aside" | "div" | "section";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: PanelTag;
}

interface TextProps extends HTMLAttributes<HTMLHeadingElement | HTMLSpanElement> {
  children: ReactNode;
}

interface MetaPillProps extends HTMLAttributes<HTMLSpanElement> {
  mono?: boolean;
}

export function Panel({
  as = "div",
  className,
  children,
  ...props
}: PanelProps) {
  const Component = as;

  return (
    <Component
      className={cn(
        "min-w-0 overflow-hidden border border-slate-500/20 bg-white/85 backdrop-blur-[18px]",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function PanelHeader({
  className,
  compact = false,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-slate-500/20 px-[22px] pt-5",
        compact ? "pb-4" : "pb-[18px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelEyebrow({ className, children, ...props }: TextProps) {
  return (
    <span
      className={cn(
        "mb-2 inline-block text-[0.72rem] font-bold uppercase tracking-[0.18em] text-teal-700",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function PanelTitle({ className, children, ...props }: TextProps) {
  return (
    <h2
      className={cn("text-[1.15rem] font-bold tracking-[-0.03em]", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function MetaPill({
  className,
  children,
  mono = false,
  ...props
}: MetaPillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[34px] min-w-[42px] items-center justify-center rounded-full bg-slate-100/90 px-3 text-[0.83rem] font-bold whitespace-nowrap text-teal-700",
        mono && "font-mono",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function SliderValuePill({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <MetaPill className={cn("min-w-[58px] font-mono", className)} {...props}>
      {children}
    </MetaPill>
  );
}
