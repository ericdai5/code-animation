import { type KeyboardEvent } from "react";

import { InfoHint } from "@/components/ui/info-hint";
import { Panel, SliderValuePill } from "@/components/ui/panel";
import {
  FieldCard,
  FieldCopy,
  FieldDescription,
  FieldHeading,
  FieldRow,
  FieldTitle,
  RangeInput,
} from "@/components/ui/settings";
import { cn } from "@/lib/cn";
import {
  formatDuration,
  STEP_HOLD_MAX_MS,
  STEP_HOLD_MIN_MS,
  STEP_HOLD_STEP_MS,
  type StepItem,
} from "@/lib/storyboard-editor";

interface CodeEditorPanelProps {
  activeStepIndex: number;
  selectedStep: StepItem | undefined;
  selectedStepHoldMs: number;
  stepCount: number;
  /** When a transition panel sits below this step, hide the shared bottom border. */
  transitionBelow: boolean;
  onCodeKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onUpdateCode: (value: string) => void;
  onUpdateHoldDuration: (durationMs: number) => void;
}

export function CodeEditorPanel({
  activeStepIndex,
  selectedStep,
  selectedStepHoldMs,
  stepCount,
  transitionBelow,
  onCodeKeyDown,
  onUpdateCode,
  onUpdateHoldDuration,
}: CodeEditorPanelProps) {
  const isLastStep = activeStepIndex === stepCount - 1;

  return (
    <Panel
      as="section"
      className={cn(
        "flex min-h-0 flex-1 flex-col focus-within:border-teal-700 focus-within:shadow-[0_12px_28px_rgba(27,52,70,0.08)] focus-within:ring-4 focus-within:ring-teal-700/10",
        "max-[1080px]:border-t-0",
        transitionBelow && "border-b-0",
        "min-[821px]:border-r-0 min-[1081px]:border-l-0",
      )}
    >
      <div className="border-b border-slate-500/20 px-5 py-5">
        <FieldCard compact>
          <FieldRow>
            <FieldCopy>
              <FieldHeading>
                <FieldTitle>Time this code stays on screen</FieldTitle>
                <InfoHint
                  text={
                    isLastStep
                      ? "After the last transition finishes, keep this code visible for this amount of time."
                      : "Before the next transition starts, keep this code visible for this amount of time."
                  }
                />
              </FieldHeading>
            </FieldCopy>
            <SliderValuePill>
              {formatDuration(selectedStepHoldMs)}
            </SliderValuePill>
          </FieldRow>

          <RangeInput
            min={STEP_HOLD_MIN_MS}
            max={STEP_HOLD_MAX_MS}
            step={STEP_HOLD_STEP_MS}
            value={selectedStepHoldMs}
            onChange={(event) =>
              onUpdateHoldDuration(Number(event.target.value))
            }
          />
        </FieldCard>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <textarea
          className="w-full flex-1 resize-none bg-transparent px-6 py-6 font-mono text-[0.9rem] text-slate-900 outline-none placeholder:text-slate-500 [line-height:1.8] [tab-size:2]"
          spellCheck={false}
          placeholder="Paste code..."
          value={selectedStep?.code ?? ""}
          onChange={(event) => onUpdateCode(event.target.value)}
          onKeyDown={onCodeKeyDown}
        />
      </div>
    </Panel>
  );
}
