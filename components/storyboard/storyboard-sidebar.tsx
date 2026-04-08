import { type DragEvent, type KeyboardEvent } from "react";

import { ActionButton } from "@/components/ui/button";
import {
  ChevronDownIcon,
  GripIcon,
  PlusIcon,
  XIcon,
} from "@/components/ui/icons";
import { InfoHint } from "@/components/ui/info-hint";
import {
  MetaPill,
  Panel,
  PanelEyebrow,
  PanelHeader,
  PanelTitle,
  SliderValuePill,
} from "@/components/ui/panel";
import {
  FieldCard,
  FieldCopy,
  FieldHeading,
  FieldRow,
  FieldTitle,
  RangeInput,
  ToggleCard,
  ToggleTrack,
} from "@/components/ui/settings";
import { cn } from "@/lib/cn";
import {
  clampDuration,
  formatDuration,
  getResolvedStepHoldMs,
  TRANSITION_MAX_MS,
  TRANSITION_MIN_MS,
  TRANSITION_STEP_MS,
  type ResolvedTransition,
  type StepItem,
} from "@/lib/storyboard-editor";
import { type HighlightMode, type TransitionConfig } from "@/lib/animator";

interface StoryboardSidebarProps {
  activeStepId: string;
  draggingStepId: string | null;
  dragOverStepId: string | null;
  expandedTransitions: Record<string, boolean>;
  steps: StepItem[];
  transitions: ResolvedTransition[];
  onAddStep: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, stepId: string) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, stepId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, stepId: string) => void;
  onRemoveStep: (stepId: string) => void;
  onSelectStep: (stepId: string) => void;
  onStepCardKey: (event: KeyboardEvent<HTMLDivElement>, stepId: string) => void;
  onToggleTransitionExpanded: (transitionId: string) => void;
  onUpdateTransitionSettings: (
    transitionId: string,
    patch: Partial<TransitionConfig>,
  ) => void;
}

export function StoryboardSidebar({
  activeStepId,
  draggingStepId,
  dragOverStepId,
  expandedTransitions,
  steps,
  transitions,
  onAddStep,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onRemoveStep,
  onSelectStep,
  onStepCardKey,
  onToggleTransitionExpanded,
  onUpdateTransitionSettings,
}: StoryboardSidebarProps) {
  return (
    <Panel
      as="aside"
      className="min-[821px]:col-span-2 min-[1081px]:col-span-1 min-[1081px]:sticky min-[1081px]:top-0 pb-[18px]"
    >
      <PanelHeader>
        <div>
          <PanelEyebrow>Steps</PanelEyebrow>
          <PanelTitle>Storyboard</PanelTitle>
        </div>
        <MetaPill>{steps.length}</MetaPill>
      </PanelHeader>

      <div className="flex flex-col gap-[10px] p-[14px] min-[821px]:p-[18px]">
        {steps.map((step, index) => {
          const isActive = step.id === activeStepId;
          const isDragging = step.id === draggingStepId;
          const isDropTarget =
            step.id === dragOverStepId && step.id !== draggingStepId;
          const transition = transitions[index];
          const stepHoldMs = getResolvedStepHoldMs(step, index, steps.length);
          const isTransitionExpanded = transition
            ? (expandedTransitions[transition.id] ?? false)
            : false;

          return (
            <div key={step.id} className="flex flex-col gap-1.5">
              <div
                className={cn(
                  "overflow-hidden rounded-[20px] border border-transparent bg-slate-50/90 transition duration-200 ease-out hover:-translate-y-px hover:border-slate-500/20",
                  "flex cursor-pointer select-none items-center gap-3 px-[14px] py-[13px] focus-visible:outline-none focus-visible:border-teal-700 focus-visible:ring-4 focus-visible:ring-teal-700/10",
                  isActive &&
                    "border-teal-800/25 bg-white/[0.98] ring-4 ring-teal-700/10",
                  isDragging && "opacity-[0.55]",
                  isDropTarget &&
                    "translate-x-1.5 border-dashed border-teal-700",
                )}
                onClick={() => onSelectStep(step.id)}
                onKeyDown={(event) => onStepCardKey(event, step.id)}
                draggable
                onDragStart={(event) => onDragStart(event, step.id)}
                onDragOver={(event) => onDragOver(event, step.id)}
                onDrop={(event) => onDrop(event, step.id)}
                onDragEnd={onDragEnd}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
              >
                <div className="min-w-0 flex-1">
                  <span className="block text-[0.92rem] font-bold">Code</span>
                  <span className="mt-2 inline-flex rounded-full bg-slate-100/90 px-2.5 py-1 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-teal-700">
                    Duration: {formatDuration(stepHoldMs)}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2 text-slate-500">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] bg-[rgba(19,35,43,0.04)]"
                    aria-hidden="true"
                  >
                    <GripIcon />
                  </span>
                  {steps.length > 2 && (
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] bg-transparent text-slate-500 transition duration-150 hover:bg-red-600/10 hover:text-red-600"
                      aria-label={`Remove step ${index + 1}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveStep(step.id);
                      }}
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              </div>

              {transition && (
                <div className="flex flex-col gap-1.5">
                  <div
                    className={cn(
                      "overflow-hidden rounded-[20px] border border-transparent bg-slate-50/90 transition duration-200 ease-out hover:-translate-y-px hover:border-slate-500/20",
                      "focus-within:border-teal-700 focus-within:ring-4 focus-within:ring-teal-700/10",
                      isTransitionExpanded &&
                        "border-teal-800/25 bg-white/[0.98] ring-4 ring-teal-700/10",
                    )}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-[14px] py-[13px] text-left focus-visible:outline-none"
                      onClick={() => onToggleTransitionExpanded(transition.id)}
                      aria-expanded={isTransitionExpanded}
                      aria-controls={`${transition.id}-settings`}
                      aria-label={`Transition from step ${index + 1} to step ${index + 2}`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block text-[0.92rem] font-bold">
                          Transition
                        </span>
                        <span className="mt-2 inline-flex rounded-full bg-slate-100/90 px-2.5 py-1 font-mono text-[0.72rem] font-bold uppercase tracking-[0.08em] text-teal-700">
                          Duration:{" "}
                          {formatDuration(transition.settings.durationMs)}
                        </span>
                      </div>

                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-[10px] bg-[rgba(19,35,43,0.04)]",
                          "shrink-0 transition-transform duration-200",
                          isTransitionExpanded && "rotate-180",
                        )}
                      >
                        <ChevronDownIcon />
                      </span>
                    </button>

                    <div
                      id={`${transition.id}-settings`}
                      className={cn(
                        "grid overflow-hidden transition-all duration-300 ease-out",
                        isTransitionExpanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                      aria-hidden={!isTransitionExpanded}
                      inert={!isTransitionExpanded}
                    >
                      <div
                        className={cn(
                          "min-h-0 overflow-hidden border-t border-slate-500/20 transition-[padding] duration-300 ease-out",
                          isTransitionExpanded
                            ? "px-3 pb-3 pt-2"
                            : "px-3 pb-0 pt-0",
                        )}
                      >
                        <div className="flex flex-col">
                          <FieldCard className="rounded-t-[14px] rounded-b-none p-3">
                            <FieldRow>
                              <FieldCopy>
                                <FieldHeading>
                                  <FieldTitle>Transition duration</FieldTitle>
                                  <InfoHint text="Controls how long this transition takes from start to finish." />
                                </FieldHeading>
                              </FieldCopy>
                              <SliderValuePill>
                                {formatDuration(transition.settings.durationMs)}
                              </SliderValuePill>
                            </FieldRow>
                            <RangeInput
                              min={TRANSITION_MIN_MS}
                              max={TRANSITION_MAX_MS}
                              step={TRANSITION_STEP_MS}
                              value={transition.settings.durationMs}
                              onChange={(event) =>
                                onUpdateTransitionSettings(transition.id, {
                                  durationMs: clampDuration(
                                    Number(event.target.value),
                                  ),
                                })
                              }
                            />
                          </FieldCard>

                          <ToggleCard className="-mt-px rounded-none">
                            <FieldCopy>
                              <FieldHeading>
                                <FieldTitle>Insert only</FieldTitle>
                                <InfoHint text="Hide deleted lines and animate inserted lines only for this transition." />
                              </FieldHeading>
                            </FieldCopy>
                            <ToggleTrack
                              checked={transition.settings.insertOnly}
                            />
                            <input
                              className="sr-only"
                              type="checkbox"
                              checked={transition.settings.insertOnly}
                              onChange={(event) =>
                                onUpdateTransitionSettings(transition.id, {
                                  insertOnly: event.target.checked,
                                })
                              }
                            />
                          </ToggleCard>

                          <ToggleCard className="-mt-px rounded-none">
                            <FieldCopy>
                              <FieldHeading>
                                <FieldTitle>Fuzzy diff</FieldTitle>
                                <InfoHint text="Loosen line matching for this transition when punctuation changes." />
                              </FieldHeading>
                            </FieldCopy>
                            <ToggleTrack
                              checked={transition.settings.fuzzyDiff}
                            />
                            <input
                              className="sr-only"
                              type="checkbox"
                              checked={transition.settings.fuzzyDiff}
                              onChange={(event) =>
                                onUpdateTransitionSettings(transition.id, {
                                  fuzzyDiff: event.target.checked,
                                })
                              }
                            />
                          </ToggleCard>

                          <FieldCard className="-mt-px rounded-t-none rounded-b-[14px] p-3">
                            <FieldRow>
                              <FieldCopy>
                                <FieldHeading>
                                  <FieldTitle>Highlight</FieldTitle>
                                  <InfoHint text="Control how changed lines are highlighted. Line highlights the full row, inline only colors the changed text." />
                                </FieldHeading>
                              </FieldCopy>
                            </FieldRow>
                            <div className="flex gap-1 rounded-full bg-[rgba(96,113,125,0.1)] p-0.5">
                              {(["none", "line", "inline"] as HighlightMode[]).map(
                                (mode) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    className={cn(
                                      "flex-1 rounded-full px-2.5 py-1 text-[0.78rem] font-semibold capitalize transition-colors duration-150",
                                      transition.settings.highlight === mode
                                        ? "bg-white text-teal-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700",
                                    )}
                                    onClick={() =>
                                      onUpdateTransitionSettings(transition.id, {
                                        highlight: mode,
                                      })
                                    }
                                  >
                                    {mode}
                                  </button>
                                ),
                              )}
                            </div>
                          </FieldCard>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ActionButton
        type="button"
        className="mx-[14px] mb-[14px] w-[calc(100%-28px)] border-dashed border-teal-700/40 bg-teal-700/5 text-teal-700 hover:bg-teal-700/10 min-[821px]:mx-[18px] min-[821px]:mb-[18px] min-[821px]:w-[calc(100%-36px)]"
        onClick={onAddStep}
      >
        <PlusIcon />
        Add Step
      </ActionButton>
    </Panel>
  );
}
