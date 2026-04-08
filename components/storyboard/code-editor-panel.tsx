import { type KeyboardEvent } from "react";

import { InfoHint } from "@/components/ui/info-hint";
import {
  Panel,
  PanelEyebrow,
  PanelHeader,
  PanelTitle,
  SliderValuePill,
} from "@/components/ui/panel";
import {
  FieldCard,
  FieldCopy,
  FieldDescription,
  FieldHeading,
  FieldRow,
  FieldTitle,
  RangeInput,
} from "@/components/ui/settings";
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
  onCodeKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onUpdateCode: (value: string) => void;
  onUpdateHoldDuration: (durationMs: number) => void;
}

export function CodeEditorPanel({
  activeStepIndex,
  selectedStep,
  selectedStepHoldMs,
  stepCount,
  onCodeKeyDown,
  onUpdateCode,
  onUpdateHoldDuration,
}: CodeEditorPanelProps) {
  const isLastStep = activeStepIndex === stepCount - 1;

  return (
    <Panel
      as="section"
      className="focus-within:border-teal-700 focus-within:shadow-[0_12px_28px_rgba(27,52,70,0.08)] focus-within:ring-4 focus-within:ring-teal-700/10"
    >
      <PanelHeader>
        <div>
          <PanelEyebrow>Code</PanelEyebrow>
          <PanelTitle>Code</PanelTitle>
        </div>
      </PanelHeader>

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
              <FieldDescription>
                {isLastStep
                  ? "How long the final code frame remains visible."
                  : "How long this code remains visible before moving to the next code block."}
              </FieldDescription>
            </FieldCopy>
            <SliderValuePill>{formatDuration(selectedStepHoldMs)}</SliderValuePill>
          </FieldRow>

          <RangeInput
            min={STEP_HOLD_MIN_MS}
            max={STEP_HOLD_MAX_MS}
            step={STEP_HOLD_STEP_MS}
            value={selectedStepHoldMs}
            onChange={(event) => onUpdateHoldDuration(Number(event.target.value))}
          />
        </FieldCard>
      </div>

      <div>
        <textarea
          className="min-h-[480px] w-full resize-y bg-transparent px-6 py-6 font-mono text-[0.9rem] text-slate-900 outline-none placeholder:text-slate-500 [line-height:1.8] [tab-size:2] min-[1081px]:min-h-[660px] min-[1321px]:min-h-[760px]"
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
