"use client";

import { useState } from "react";

import { ChevronDown, Zap } from "lucide-react";

import { InfoHint } from "@/components/ui/info-hint";
import { MetaPill, Panel, SliderValuePill } from "@/components/ui/panel";
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
  TRANSITION_MAX_MS,
  TRANSITION_MIN_MS,
  TRANSITION_STEP_MS,
  type ResolvedTransition,
} from "@/lib/storyboard-editor";
import { type HighlightMode, type TransitionConfig } from "@/lib/animator";

interface TransitionPanelProps {
  transition: ResolvedTransition;
  onUpdateTransitionSettings: (
    transitionId: string,
    patch: Partial<TransitionConfig>,
  ) => void;
}

export function TransitionPanel({
  transition,
  onUpdateTransitionSettings,
}: TransitionPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Panel
      as="section"
      className="flex min-h-0 flex-col min-[821px]:border-r-0 min-[1081px]:border-l-0"
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-3 px-[22px] py-4 text-left transition-colors hover:bg-slate-50/80",
          expanded && "border-b border-slate-500/20",
        )}
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="flex min-w-0 items-center gap-2 text-[0.92rem] font-bold text-slate-800">
          <Zap className="size-[15px] shrink-0 text-teal-700" aria-hidden />
          Transition
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <MetaPill className="font-mono text-[0.72rem] uppercase tracking-[0.08em]">
            {formatDuration(transition.settings.durationMs)}
          </MetaPill>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-slate-500 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-5 py-4">
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
                      durationMs: clampDuration(Number(event.target.value)),
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
                <ToggleTrack checked={transition.settings.insertOnly} />
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
                <ToggleTrack checked={transition.settings.fuzzyDiff} />
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
                  {(["none", "line", "inline"] as HighlightMode[]).map((mode) => (
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
                  ))}
                </div>
              </FieldCard>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
