import { type TransitionConfig } from "@/lib/animator";
import {
  DEFAULT_STORYBOARD_TEXT,
  parseStoryboardText,
  type ParsedStoryboardText,
} from "@/lib/storyboard-text";

export const DEFAULT_TRANSITION_SETTINGS: TransitionConfig = {
  durationMs: 1000,
  insertOnly: false,
  fuzzyDiff: false,
  highlight: "line",
  nextStepPersistence: true,
};

export const TRANSITION_MIN_MS = 200;
export const TRANSITION_MAX_MS = 4000;
export const TRANSITION_STEP_MS = 100;
export const STEP_HOLD_MIN_MS = 0;
export const STEP_HOLD_MAX_MS = 8000;
export const STEP_HOLD_STEP_MS = 100;
export const DEFAULT_STEP_HOLD_MS = 250;
export const EXPORT_WARMUP_MS = 100;
export const EXPORT_TAIL_MS = 200;
export const EXPORT_PRESET_OPTIONS = [
  {
    id: "1080p",
    label: "1080p",
    targetWidth: 1920,
    bitrate: 16_000_000,
    meta: "1920px wide",
  },
  {
    id: "1440p",
    label: "1440p",
    targetWidth: 2560,
    bitrate: 24_000_000,
    meta: "2560px wide",
  },
  {
    id: "4k",
    label: "4K",
    targetWidth: 3840,
    bitrate: 36_000_000,
    meta: "3840px wide",
  },
] as const;

export type ExportPresetId = (typeof EXPORT_PRESET_OPTIONS)[number]["id"];
export type ExportPreset = (typeof EXPORT_PRESET_OPTIONS)[number];

export interface StepItem {
  id: string;
  code: string;
  holdDurationMs?: number;
}

export interface ResolvedTransition {
  id: string;
  fromStep: StepItem;
  toStep: StepItem;
  settings: TransitionConfig;
  fromStepHoldMs: number;
}

export interface AnimationRangeSelection {
  startStepId: string;
  endStepId: string;
}

export interface ResolvedAnimationRange extends AnimationRangeSelection {
  startIndex: number;
  endIndex: number;
}

export interface PlaybackSequence {
  range: ResolvedAnimationRange;
  steps: StepItem[];
  transitions: ResolvedTransition[];
  startStep: StepItem;
  endStep: StepItem;
  finalStepHoldMs: number;
  totalDurationMs: number;
}

interface InitialStoryboardState {
  steps: StepItem[];
  transitionSettings: Record<string, TransitionConfig>;
}

export const DEFAULT_EXPORT_PRESET_ID: ExportPresetId = "1080p";

export function getTransitionKey(fromStepId: string, toStepId: string) {
  return `${fromStepId}__${toStepId}`;
}

export function clampDuration(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_TRANSITION_SETTINGS.durationMs;
  return Math.min(
    TRANSITION_MAX_MS,
    Math.max(TRANSITION_MIN_MS, Math.round(value)),
  );
}

export function clampStepHoldDuration(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(STEP_HOLD_MAX_MS, Math.max(STEP_HOLD_MIN_MS, Math.round(value)));
}

export function getDefaultStepHoldMs(index: number, stepCount: number) {
  return index === 0 || index === stepCount - 1 ? 0 : DEFAULT_STEP_HOLD_MS;
}

const VALID_HIGHLIGHT_MODES = new Set(["none", "line", "inline"]);

export function normalizeTransitionConfig(
  config?: Partial<TransitionConfig>,
): TransitionConfig {
  const highlight = config?.highlight;
  return {
    durationMs: clampDuration(
      config?.durationMs ?? DEFAULT_TRANSITION_SETTINGS.durationMs,
    ),
    insertOnly: config?.insertOnly ?? DEFAULT_TRANSITION_SETTINGS.insertOnly,
    fuzzyDiff: config?.fuzzyDiff ?? DEFAULT_TRANSITION_SETTINGS.fuzzyDiff,
    nextStepPersistence:
      config?.nextStepPersistence ??
      DEFAULT_TRANSITION_SETTINGS.nextStepPersistence,
    highlight:
      highlight && VALID_HIGHLIGHT_MODES.has(highlight)
        ? highlight
        : DEFAULT_TRANSITION_SETTINGS.highlight,
  };
}

export function getResolvedStepHoldMs(
  step: StepItem,
  index: number,
  stepCount: number,
) {
  return clampStepHoldDuration(
    step.holdDurationMs ?? getDefaultStepHoldMs(index, stepCount),
  );
}

export function buildFullAnimationRange(steps: StepItem[]): AnimationRangeSelection {
  const firstStep = steps[0];
  const lastStep = steps[steps.length - 1] ?? firstStep;

  return {
    startStepId: firstStep?.id ?? "",
    endStepId: lastStep?.id ?? firstStep?.id ?? "",
  };
}

export function resolveAnimationRange(
  range: AnimationRangeSelection | null | undefined,
  steps: StepItem[],
): ResolvedAnimationRange | null {
  if (!steps.length) return null;

  const rawStartIndex = steps.findIndex(
    (step) => step.id === range?.startStepId,
  );
  const rawEndIndex = steps.findIndex((step) => step.id === range?.endStepId);
  const startIndex = rawStartIndex >= 0 ? rawStartIndex : 0;
  const endIndex = rawEndIndex >= 0 ? rawEndIndex : steps.length - 1;
  let orderedStartIndex = Math.min(startIndex, endIndex);
  let orderedEndIndex = Math.max(startIndex, endIndex);

  if (orderedStartIndex === orderedEndIndex && steps.length > 1) {
    if (orderedEndIndex === steps.length - 1) {
      orderedStartIndex = Math.max(0, orderedEndIndex - 1);
    } else {
      orderedEndIndex = Math.min(steps.length - 1, orderedStartIndex + 1);
    }
  }

  return {
    startStepId: steps[orderedStartIndex].id,
    endStepId: steps[orderedEndIndex].id,
    startIndex: orderedStartIndex,
    endIndex: orderedEndIndex,
  };
}

function buildStepItems(parsedSteps: ParsedStoryboardText["steps"]) {
  return parsedSteps.map((step, index) => ({
    id: `step-${index + 1}`,
    code: step.code,
    holdDurationMs:
      step.durationMs === undefined
        ? undefined
        : clampStepHoldDuration(step.durationMs),
  }));
}

export function buildInitialStoryboardState(
  parsedStoryboard: ParsedStoryboardText,
): InitialStoryboardState {
  const parsedSteps = parsedStoryboard.steps.length
    ? parsedStoryboard.steps
    : parseStoryboardText(DEFAULT_STORYBOARD_TEXT).steps;
  const steps = buildStepItems(parsedSteps);
  const transitionSettings: Record<string, TransitionConfig> = {};

  parsedStoryboard.gaps.forEach((gap, index) => {
    const fromStep = steps[index];
    const toStep = steps[index + 1];

    if (!fromStep || !toStep) return;

    const transitionId = getTransitionKey(fromStep.id, toStep.id);

    if (gap.transition) {
      transitionSettings[transitionId] = normalizeTransitionConfig(
        gap.transition,
      );
    }
  });

  return {
    steps,
    transitionSettings,
  };
}

export const INITIAL_STORYBOARD = buildInitialStoryboardState(
  parseStoryboardText(DEFAULT_STORYBOARD_TEXT),
);
export const INITIAL_STEPS = INITIAL_STORYBOARD.steps;

export function formatDuration(durationMs: number) {
  const seconds = (durationMs / 1000).toFixed(1);
  return `${seconds.replace(/\.0$/, "")}s`;
}

export function getExportPreset(presetId: ExportPresetId): ExportPreset {
  return (
    EXPORT_PRESET_OPTIONS.find((preset) => preset.id === presetId) ??
    EXPORT_PRESET_OPTIONS[0]
  );
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function getCanvasLogicalWidth(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
) {
  const fallbackDpr = window.devicePixelRatio || 1;
  return Math.min(
    sourceCanvas.parentElement?.clientWidth ||
      sourceCanvas.clientWidth ||
      sourceCanvas.width / fallbackDpr ||
      targetWidth,
    targetWidth,
  );
}

export function createHiddenExportCanvas(logicalWidth: number) {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${logicalWidth}px`;
  host.style.opacity = "0";
  host.style.pointerEvents = "none";

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";

  host.appendChild(canvas);
  document.body.appendChild(host);

  return {
    canvas,
    cleanup: () => host.remove(),
  };
}

export function buildResolvedTransitions(
  steps: StepItem[],
  transitionSettings: Record<string, TransitionConfig>,
) {
  const transitions: ResolvedTransition[] = [];

  for (let index = 0; index < steps.length - 1; index++) {
    const fromStep = steps[index];
    const toStep = steps[index + 1];
    const transitionId = getTransitionKey(fromStep.id, toStep.id);

    transitions.push({
      id: transitionId,
      fromStep,
      toStep,
      settings:
        transitionSettings[transitionId] ?? DEFAULT_TRANSITION_SETTINGS,
      fromStepHoldMs: getResolvedStepHoldMs(fromStep, index, steps.length),
    });
  }

  return transitions;
}

export function buildPlaybackSequence(
  steps: StepItem[],
  transitionSettings: Record<string, TransitionConfig>,
  range: AnimationRangeSelection | null | undefined,
): PlaybackSequence | null {
  const resolvedRange = resolveAnimationRange(range, steps);
  if (!resolvedRange) return null;

  const transitions = buildResolvedTransitions(steps, transitionSettings).slice(
    resolvedRange.startIndex,
    resolvedRange.endIndex,
  );
  const selectedSteps = steps.slice(
    resolvedRange.startIndex,
    resolvedRange.endIndex + 1,
  );
  const startStep = steps[resolvedRange.startIndex];
  const endStep = steps[resolvedRange.endIndex];
  const finalStepHoldMs = getResolvedStepHoldMs(
    endStep,
    resolvedRange.endIndex,
    steps.length,
  );
  const totalDurationMs =
    transitions.reduce(
      (sum, item) =>
        sum +
        item.fromStepHoldMs +
        Math.max(TRANSITION_MIN_MS, item.settings.durationMs),
      0,
    ) + finalStepHoldMs;

  return {
    range: resolvedRange,
    steps: selectedSteps,
    transitions,
    startStep,
    endStep,
    finalStepHoldMs,
    totalDurationMs,
  };
}
