import { type RefObject } from "react";

import { cn } from "@/lib/cn";
import { Panel } from "@/components/ui/panel";

interface PreviewPanelProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  progress: number;
  running: boolean;
  stepLabel: string;
}

export function PreviewPanel({
  canvasRef,
  progress,
  running,
  stepLabel,
}: PreviewPanelProps) {
  return (
    <Panel className="max-[820px]:border-t-0 border-b-0">
      <div className="flex flex-wrap items-center gap-[14px] border-b border-slate-500/20 bg-gradient-to-b from-slate-50/95 to-slate-100/95 px-5 py-[18px]">
        <span className="inline-flex items-center gap-2 whitespace-nowrap text-[0.77rem] font-bold uppercase tracking-[0.14em] text-slate-500">
          <span
            className={cn(
              "h-[7px] w-[7px] rounded-full bg-green-700 opacity-[0.28] transition-opacity duration-300",
              running && "animate-pulse opacity-100",
            )}
          />
          Animation Preview
        </span>
        <span className="whitespace-nowrap font-mono text-[0.78rem] font-bold uppercase tracking-[0.08em] text-teal-700">
          {stepLabel || "Ready to animate"}
        </span>
        <div className="h-1 min-w-24 flex-1 basis-full overflow-hidden rounded-full bg-[rgba(96,113,125,0.18)] min-[821px]:basis-auto">
          <div
            className="h-full bg-[linear-gradient(90deg,#0f766e,#f59e0b)] transition-[width] duration-75 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="min-h-[280px]">
        <canvas ref={canvasRef} className="block w-full" />
      </div>
    </Panel>
  );
}
