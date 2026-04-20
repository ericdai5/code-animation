import {
  useEffect,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

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
  type AnimationRangeSelection,
  clampStepHoldDuration,
  DEFAULT_STEP_HOLD_MS,
  formatDuration,
  getResolvedStepHoldMs,
  type ResolvedAnimationRange,
  type ResolvedTransition,
  type StepItem,
} from "@/lib/storyboard-editor";

interface StoryboardSidebarProps {
  activeStepId: string;
  activeTransitionId: string | null;
  animationRange: ResolvedAnimationRange | null;
  draggingStepId: string | null;
  selectedDurationMs: number;
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
  onUpdateAnimationRange: (nextRange: AnimationRangeSelection) => void;
  onStepCardKey: (event: KeyboardEvent<HTMLDivElement>, stepId: string) => void;
}

export function StoryboardSidebar({
  activeStepId,
  activeTransitionId,
  animationRange,
  draggingStepId,
  selectedDurationMs,
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
  onUpdateAnimationRange,
  onStepCardKey,
}: StoryboardSidebarProps) {
  const [draggingBoundary, setDraggingBoundary] = useState<
    "start" | "end" | null
  >(null);
  const totalDurationMs =
    steps.reduce(
      (sum, step) =>
        sum +
        clampStepHoldDuration(step.holdDurationMs ?? DEFAULT_STEP_HOLD_MS),
      0,
    ) + transitions.reduce((sum, t) => sum + t.settings.durationMs, 0);

  const isDragging = draggingStepId !== null;
  const displayDurationMs = animationRange
    ? selectedDurationMs
    : totalDurationMs;

  useEffect(() => {
    if (!draggingBoundary) return;

    const stopDragging = () => setDraggingBoundary(null);

    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [draggingBoundary]);

  const updateRangeBoundary = (
    boundary: "start" | "end",
    stepIndex: number,
  ) => {
    if (!animationRange || !steps[stepIndex]) return;

    if (boundary === "start") {
      const maxStartIndex = Math.max(0, animationRange.endIndex - 1);
      const nextStartIndex = Math.min(stepIndex, maxStartIndex);
      const nextStartStepId = steps[nextStartIndex].id;
      const currentEndStepId = steps[animationRange.endIndex].id;

      if (
        nextStartStepId === animationRange.startStepId &&
        currentEndStepId === animationRange.endStepId
      ) {
        return;
      }

      onUpdateAnimationRange({
        startStepId: nextStartStepId,
        endStepId: currentEndStepId,
      });
      return;
    }

    const minEndIndex = Math.min(
      steps.length - 1,
      animationRange.startIndex + 1,
    );
    const nextEndIndex = Math.max(stepIndex, minEndIndex);
    const currentStartStepId = steps[animationRange.startIndex].id;
    const nextEndStepId = steps[nextEndIndex].id;

    if (
      currentStartStepId === animationRange.startStepId &&
      nextEndStepId === animationRange.endStepId
    ) {
      return;
    }

    onUpdateAnimationRange({
      startStepId: currentStartStepId,
      endStepId: nextEndStepId,
    });
  };

  const handleBoundaryPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    boundary: "start" | "end",
  ) => {
    event.preventDefault();
    setDraggingBoundary(boundary);
  };

  return (
    <Panel
      as="aside"
      className="flex h-full flex-col min-[821px]:col-span-2 min-[1081px]:col-span-1 pb-[18px]"
    >
      <PanelHeader>
        <div>
          <PanelTitle>Storyboard</PanelTitle>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <MetaPill>{formatDuration(displayDurationMs)}</MetaPill>
        </div>
      </PanelHeader>

      <div className="flex flex-1 flex-col gap-[10px] overflow-y-auto py-[14px] pr-[8px] pl-0 min-[821px]:py-[18px] min-[821px]:pr-[10px] min-[821px]:pl-0">
        {steps.map((step, index) => {
          const isActive = step.id === activeStepId;
          const isThisDragging = step.id === draggingStepId;
          const transition = transitions[index];
          const stepHoldMs = getResolvedStepHoldMs(step, index, steps.length);
          const isTransitionActive = transition
            ? transition.id === activeTransitionId
            : false;
          const isRangeStart = animationRange
            ? index === animationRange.startIndex
            : false;
          const isRangeEnd = animationRange
            ? index === animationRange.endIndex
            : false;
          const isInRange = animationRange
            ? index >= animationRange.startIndex &&
              index <= animationRange.endIndex
            : false;
          const highlightAbove = animationRange
            ? index > animationRange.startIndex &&
              index <= animationRange.endIndex
            : false;
          const highlightBelow = animationRange
            ? index >= animationRange.startIndex &&
              index < animationRange.endIndex
            : false;
          const startHandleActive =
            isRangeStart && draggingBoundary === "start";
          const endHandleActive = isRangeEnd && draggingBoundary === "end";
          const dotLabel = draggingBoundary
            ? `Drag ${draggingBoundary === "start" ? "range start" : "range end"} across Step ${index + 1}`
            : `Timeline node for Step ${index + 1}`;

          return (
            <div key={step.id} className="flex min-w-0 gap-2 px-[8px]">
              <div
                className={cn(
                  "relative w-[40px] shrink-0",
                  draggingBoundary && "cursor-row-resize",
                )}
                onPointerEnter={() => {
                  if (draggingBoundary) {
                    updateRangeBoundary(draggingBoundary, index);
                  }
                }}
                onPointerMove={() => {
                  if (draggingBoundary) {
                    updateRangeBoundary(draggingBoundary, index);
                  }
                }}
              >
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute left-[20px] top-[-5px] h-[25px] w-px -translate-x-1/2",
                      highlightAbove
                        ? "bg-gradient-to-b from-teal-500/60 to-teal-700/90"
                        : "bg-slate-200/90",
                    )}
                    aria-hidden
                  />
                )}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[20px] top-[20px] bottom-[-5px] w-px -translate-x-1/2",
                      highlightBelow
                        ? "bg-gradient-to-b from-teal-700/90 to-teal-500/60"
                        : "bg-slate-200/90",
                    )}
                    aria-hidden
                  />
                )}

                {isRangeStart || isRangeEnd ? (
                  <button
                    type="button"
                    className={cn(
                      "absolute left-[20px] top-[20px] -translate-x-1/2 -translate-y-1/2 transition duration-150",
                      "touch-none active:cursor-grabbing",
                      isRangeStart &&
                        "size-[18px] rounded-full border-[4px] border-teal-700 bg-white shadow-[0_0_0_5px_rgba(13,148,136,0.12)]",
                      isRangeEnd &&
                        "size-[18px] rounded-[6px] border-[4px] border-amber-500 bg-white shadow-[0_0_0_5px_rgba(245,158,11,0.12)]",
                      startHandleActive &&
                        "scale-[1.06] shadow-[0_0_0_6px_rgba(13,148,136,0.18)]",
                      endHandleActive &&
                        "scale-[1.06] shadow-[0_0_0_6px_rgba(245,158,11,0.18)]",
                    )}
                    onPointerDown={(event) =>
                      handleBoundaryPointerDown(
                        event,
                        isRangeStart ? "start" : "end",
                      )
                    }
                    aria-label={
                      isRangeStart
                        ? "Drag animation start handle"
                        : "Drag animation end handle"
                    }
                    aria-pressed={
                      isRangeStart ? startHandleActive : endHandleActive
                    }
                    title={
                      isRangeStart
                        ? "Drag to change animation start"
                        : "Drag to change animation end"
                    }
                  >
                    <span
                      className={cn(
                        "absolute inset-[3px] rounded-full",
                        isRangeStart && "bg-teal-700",
                        isRangeEnd && "rounded-[2px] bg-amber-500",
                      )}
                      aria-hidden
                    />
                  </button>
                ) : (
                  <div
                    className={cn(
                      "absolute left-[20px] top-[20px] -translate-x-1/2 -translate-y-1/2 transition duration-150",
                      isInRange
                        ? "size-[12px] rounded-full border-[3px] border-teal-700 bg-teal-600"
                        : "size-[12px] rounded-full border-[2px] border-slate-300 bg-white/96",
                      draggingBoundary && "scale-[1.04]",
                    )}
                    aria-hidden
                    title={dotLabel}
                  />
                )}
              </div>

              <div
                className={cn(
                  "group/card flex min-w-0 flex-1 flex-col rounded-[20px] border border-transparent transition duration-200 ease-out",
                  "cursor-grab hover:border-slate-500/20 active:cursor-grabbing",
                  isInRange &&
                    "bg-white/[0.94] shadow-[inset_0_0_0_1px_rgba(13,148,136,0.05)]",
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
                  <span className="flex items-center gap-1.5 text-[0.8rem] font-semibold">
                    <SquareCode size={13} /> Code
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
                    <span className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-slate-900">
                      <Zap size={13} aria-hidden />
                      Transition
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-1 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-teal-700">
                      <Clock size={11} />{" "}
                      {formatDuration(transition.settings.durationMs)}
                    </span>
                  </div>
                )}
              </div>
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
