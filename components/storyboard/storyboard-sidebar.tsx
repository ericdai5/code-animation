import { type DragEvent, type KeyboardEvent } from "react";

import { ActionButton } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { Clock, SquareCode, Trash2, Zap } from "lucide-react";
import {
  MetaPill,
  Panel,
  PanelHeader,
  PanelTitle,
} from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import {
  clampStepHoldDuration,
  DEFAULT_STEP_HOLD_MS,
  formatDuration,
  getResolvedStepHoldMs,
  type ResolvedTransition,
  type StepItem,
} from "@/lib/storyboard-editor";

interface StoryboardSidebarProps {
  activeStepId: string;
  activeTransitionId: string | null;
  draggingStepId: string | null;
  steps: StepItem[];
  transitions: ResolvedTransition[];
  onAddStep: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, stepId: string) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, stepId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, stepId: string) => void;
  onDropOnTrash: (event: DragEvent<HTMLDivElement>) => void;
  onTrashDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onSelectStep: (stepId: string) => void;
  onSelectTransition: (transitionId: string) => void;
  onStepCardKey: (event: KeyboardEvent<HTMLDivElement>, stepId: string) => void;
}

export function StoryboardSidebar({
  activeStepId,
  activeTransitionId,
  draggingStepId,
  steps,
  transitions,
  onAddStep,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onDropOnTrash,
  onTrashDragOver,
  onSelectStep,
  onSelectTransition,
  onStepCardKey,
}: StoryboardSidebarProps) {
  const totalDurationMs =
    steps.reduce(
      (sum, step) =>
        sum +
        clampStepHoldDuration(step.holdDurationMs ?? DEFAULT_STEP_HOLD_MS),
      0,
    ) + transitions.reduce((sum, t) => sum + t.settings.durationMs, 0);

  const isDragging = draggingStepId !== null;

  return (
    <Panel
      as="aside"
      className="flex h-full flex-col min-[821px]:col-span-2 min-[1081px]:col-span-1 pb-[18px]"
    >
      <PanelHeader>
        <div>
          <PanelTitle>Storyboard</PanelTitle>
        </div>
        <MetaPill>{formatDuration(totalDurationMs)}</MetaPill>
      </PanelHeader>

      <div className="flex flex-1 flex-col gap-[10px] overflow-y-auto p-[14px] min-[821px]:p-[18px]">
        {steps.map((step, index) => {
          const isActive = step.id === activeStepId;
          const isThisDragging = step.id === draggingStepId;
          const transition = transitions[index];
          const stepHoldMs = getResolvedStepHoldMs(step, index, steps.length);
          const isTransitionActive = transition
            ? transition.id === activeTransitionId
            : false;

          return (
            <div
              key={step.id}
              className={cn(
                "group/card flex min-w-0 flex-col rounded-[20px] border border-transparent transition duration-200 ease-out",
                "cursor-grab hover:border-slate-500/20 active:cursor-grabbing",
                (isActive || isTransitionActive) &&
                  "!border-slate-300 bg-white/[0.98]",
                isThisDragging && "opacity-[0.55]",
              )}
              draggable
              onDragStart={(event) => onDragStart(event, step.id)}
              onDragOver={(event) => onDragOver(event, step.id)}
              onDrop={(event) => onDrop(event, step.id)}
              onDragEnd={onDragEnd}
            >
                <div
                  className={cn(
                    "flex cursor-inherit select-none items-center justify-between px-[14px] py-[10px] focus-visible:outline-none",
                    !transition && "rounded-[20px]",
                    transition && "rounded-t-[20px]",
                    isActive && "bg-white/[0.98]",
                    !(isActive || isTransitionActive) &&
                      "bg-slate-50/90 group-hover/card:bg-slate-50/50",
                  )}
                  onClick={() => onSelectStep(step.id)}
                  onKeyDown={(event) => onStepCardKey(event, step.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                >
                  <span className="flex items-center gap-1.5 text-[0.92rem] font-bold">
                    <SquareCode size={15} /> Code
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-1 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-teal-700">
                    <Clock size={11} /> {formatDuration(stepHoldMs)}
                  </span>
                </div>

                {transition && (
                  <div
                    className={cn(
                      "flex cursor-inherit select-none items-center justify-between rounded-b-[20px] border-t border-t-slate-200/60 px-[14px] py-[9px]",
                      isTransitionActive && "bg-white/[0.98]",
                      !isTransitionActive &&
                        !(isActive || isTransitionActive) &&
                        "bg-slate-50/60 group-hover/card:bg-slate-50/30",
                    )}
                    onClick={() => onSelectTransition(transition.id)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isTransitionActive}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectTransition(transition.id);
                      }
                    }}
                  >
                    <span className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-slate-500">
                      <Zap size={13} /> Transition
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-1 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-teal-700">
                      <Clock size={11} />{" "}
                      {formatDuration(transition.settings.durationMs)}
                    </span>
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {isDragging && steps.length > 2 ? (
        <div
          className="mx-[14px] mb-[14px] flex items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-red-400/50 bg-red-50 py-3 text-[0.88rem] font-semibold text-red-500 transition duration-200 hover:border-red-500 hover:bg-red-100/80 hover:text-red-600 min-[821px]:mx-[18px] min-[821px]:mb-[18px]"
          onDragOver={onTrashDragOver}
          onDrop={onDropOnTrash}
        >
          <Trash2 size={16} />
          Drop to Delete
        </div>
      ) : (
        <ActionButton
          type="button"
          className="mx-[14px] mb-[14px] w-[calc(100%-28px)] border-dashed border-teal-700/40 bg-teal-700/5 text-teal-700 hover:bg-teal-700/10 min-[821px]:mx-[18px] min-[821px]:mb-[18px] min-[821px]:w-[calc(100%-36px)]"
          onClick={onAddStep}
        >
          <PlusIcon />
          Add Step
        </ActionButton>
      )}
    </Panel>
  );
}
