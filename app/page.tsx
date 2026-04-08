"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import { CodeEditorPanel } from "@/components/storyboard/code-editor-panel";
import { ColorPanel } from "@/components/storyboard/color-panel";
import { PlaybackPanel } from "@/components/storyboard/playback-panel";
import { PreviewPanel } from "@/components/storyboard/preview-panel";
import { StoryboardSidebar } from "@/components/storyboard/storyboard-sidebar";
import { TransitionPanel } from "@/components/storyboard/transition-panel";
import {
  CanvasAnimator,
  measureStaticTextHeight,
  measureTransitionMaxHeight,
  type ColorConfig,
  type TransitionConfig,
} from "@/lib/animator";
import {
  buildInitialStoryboardState,
  buildResolvedTransitions,
  clampStepHoldDuration,
  createHiddenExportCanvas,
  DEFAULT_EXPORT_PRESET_ID,
  DEFAULT_TRANSITION_SETTINGS,
  EXPORT_TAIL_MS,
  EXPORT_WARMUP_MS,
  getCanvasLogicalWidth,
  getExportPreset,
  getResolvedStepHoldMs,
  getTransitionKey,
  INITIAL_STEPS,
  INITIAL_STORYBOARD,
  normalizeTransitionConfig,
  sleep,
  TRANSITION_MIN_MS,
  type ExportPresetId,
  type StepItem,
} from "@/lib/storyboard-editor";
import { parseStoryboardText } from "@/lib/storyboard-text";

const NOISE_BACKGROUND =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E\")";

export default function Home() {
  const [steps, setSteps] = useState<StepItem[]>(INITIAL_STORYBOARD.steps);
  const [activeStepId, setActiveStepId] = useState(INITIAL_STEPS[0]?.id ?? "");
  const [draggingStepId, setDraggingStepId] = useState<string | null>(null);

  const [activeTransitionId, setActiveTransitionId] = useState<string | null>(
    null,
  );
  const [transitionSettings, setTransitionSettings] = useState<
    Record<string, TransitionConfig>
  >(INITIAL_STORYBOARD.transitionSettings);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [exportPresetId, setExportPresetId] = useState<ExportPresetId>(
    DEFAULT_EXPORT_PRESET_ID,
  );
  const [colors, setColors] = useState<ColorConfig>({
    bg: "#f8fbfc",
    text: "#13232b",
    inserted: "#15803d",
    deleted: "#dc2626",
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatorRef = useRef<CanvasAnimator | null>(null);
  const stepsRef = useRef(steps);
  const transitionSettingsRef = useRef(transitionSettings);
  const nextStepIdRef = useRef(INITIAL_STEPS.length + 1);

  stepsRef.current = steps;
  transitionSettingsRef.current = transitionSettings;

  const activeStepIndex = steps.findIndex((step) => step.id === activeStepId);
  const selectedStep = activeStepIndex >= 0 ? steps[activeStepIndex] : undefined;
  const resolvedActiveStepId = selectedStep?.id ?? "";
  const resolvedActiveStepIndex = selectedStep
    ? steps.findIndex((step) => step.id === selectedStep.id)
    : -1;
  const transitions = buildResolvedTransitions(steps, transitionSettings);
  const selectedStepHoldMs = selectedStep
    ? getResolvedStepHoldMs(selectedStep, resolvedActiveStepIndex, steps.length)
    : 0;
  const exportPreset = getExportPreset(exportPresetId);

  useEffect(() => {
    if (activeStepId && !steps.some((step) => step.id === activeStepId) && steps[0]) {
      setActiveStepId(steps[0].id);
    }
  }, [activeStepId, steps]);

  useEffect(() => {
    const controller = new AbortController();

    const loadStoryboard = async () => {
      try {
        const response = await fetch("/api/storyboard", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const text = await response.text();
        const nextStoryboard = buildInitialStoryboardState(
          parseStoryboardText(text),
        );

        if (!nextStoryboard.steps.length || controller.signal.aborted) return;

        setSteps(nextStoryboard.steps);
        setTransitionSettings(nextStoryboard.transitionSettings);
        setActiveTransitionId(null);
        setActiveStepId(nextStoryboard.steps[0]?.id ?? "");
        nextStepIdRef.current = nextStoryboard.steps.length + 1;
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load storyboard text file.", error);
        }
      }
    };

    void loadStoryboard();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const animator = new CanvasAnimator(canvasRef.current);
    animatorRef.current = animator;

    document.fonts.ready.then(() => {
      animator.updateDpr();
      animator.drawPlaceholder();
    });

    const handleResize = () => {
      animator.updateDpr();
      if (!animator.running) animator.drawPlaceholder();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!animatorRef.current) return;
    animatorRef.current.colors = colors;
    if (!animatorRef.current.running) animatorRef.current.drawPlaceholder();
  }, [colors]);

  const updateColor = (key: keyof ColorConfig, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const updateTransitionSettings = (
    transitionId: string,
    patch: Partial<TransitionConfig>,
  ) => {
    setTransitionSettings((prev) => {
      const existing = prev[transitionId] ?? DEFAULT_TRANSITION_SETTINGS;
      return {
        ...prev,
        [transitionId]: normalizeTransitionConfig({
          ...existing,
          ...patch,
        }),
      };
    });
  };

  const updateStepHoldDuration = (stepId: string, durationMs: number) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? {
              ...step,
              holdDurationMs: clampStepHoldDuration(durationMs),
            }
          : step,
      ),
    );
  };

  const selectTransition = (transitionId: string) => {
    setActiveTransitionId((prev) =>
      prev === transitionId ? null : transitionId,
    );
  };

  const halt = useCallback(() => {
    const animator = animatorRef.current;
    if (!animator) return;
    animator.halt();
    setRunning(false);
    setStepLabel("");
  }, []);

  const playTransitionSequence = useCallback(
    async (
      animator: CanvasAnimator,
      items: ReturnType<typeof buildResolvedTransitions>,
      options?: {
        onProgress?: (value: number) => void;
        onStepLabel?: (value: string) => void;
      },
    ) => {
      animator.running = true;
      const finalStep = items[items.length - 1]?.toStep;
      const finalStepHoldMs = finalStep
        ? getResolvedStepHoldMs(finalStep, items.length, items.length + 1)
        : 0;
      const totalDurationMs =
        items.reduce(
          (sum, item) =>
            sum +
            item.fromStepHoldMs +
            Math.max(TRANSITION_MIN_MS, item.settings.durationMs),
          0,
        ) + finalStepHoldMs;
      let elapsedMs = 0;

      for (let index = 0; index < items.length; index++) {
        if (!animator.running) break;

        const item = items[index];

        if (item.fromStepHoldMs > 0) {
          options?.onStepLabel?.(`Hold on Step ${index + 1}`);

          await animator.holdFrame(
            item.fromStep.code,
            item.fromStepHoldMs,
            (value) =>
              options?.onProgress?.(
                totalDurationMs <= 0
                  ? 1
                  : (elapsedMs + value * item.fromStepHoldMs) / totalDurationMs,
              ),
          );

          elapsedMs += item.fromStepHoldMs;
        }

        if (!animator.running) break;

        options?.onStepLabel?.(`Step ${index + 1} to ${index + 2}`);

        await animator.animateTransition(
          item.fromStep.code,
          item.toStep.code,
          item.settings,
          (value) =>
            options?.onProgress?.(
              totalDurationMs <= 0
                ? 1
                : (elapsedMs + value * item.settings.durationMs) /
                    totalDurationMs,
            ),
        );
        elapsedMs += item.settings.durationMs;
      }

      if (animator.running && finalStep && finalStepHoldMs > 0) {
        options?.onStepLabel?.(`Hold on Step ${items.length + 1}`);

        await animator.holdFrame(
          finalStep.code,
          finalStepHoldMs,
          (value) =>
            options?.onProgress?.(
              totalDurationMs <= 0
                ? 1
                : (elapsedMs + value * finalStepHoldMs) / totalDurationMs,
            ),
        );

        elapsedMs += finalStepHoldMs;
      }

      return animator.running;
    },
    [],
  );

  const playTransitions = useCallback(
    async (items: ReturnType<typeof buildResolvedTransitions>) => {
      const animator = animatorRef.current;
      if (!animator) return false;

      setRunning(true);
      setProgress(0);

      return playTransitionSequence(animator, items, {
        onProgress: setProgress,
        onStepLabel: setStepLabel,
      });
    },
    [playTransitionSequence],
  );

  const animateAll = useCallback(async () => {
    const animator = animatorRef.current;
    if (!animator) return;

    if (animator.running) {
      halt();
      return;
    }

    const currentTransitions = buildResolvedTransitions(
      stepsRef.current,
      transitionSettingsRef.current,
    );

    if (currentTransitions.length === 0) return;

    const completed = await playTransitions(currentTransitions);
    if (completed) {
      setProgress(1);
      halt();
    }
  }, [halt, playTransitions]);

  const reset = useCallback(() => {
    halt();
    animatorRef.current?.drawPlaceholder();
    setProgress(0);
  }, [halt]);

  const exportVideo = useCallback(async () => {
    const animator = animatorRef.current;
    const canvas = canvasRef.current;
    if (!animator || !canvas) return;

    const currentTransitions = buildResolvedTransitions(
      stepsRef.current,
      transitionSettingsRef.current,
    );

    if (currentTransitions.length === 0) return;
    if (animator.running) halt();

    setExporting(true);
    setProgress(0);

    let exportAnimator: CanvasAnimator | null = null;
    let cleanupExportCanvas: (() => void) | null = null;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let exportTrack: (MediaStreamTrack & { requestFrame?: () => void }) | null =
      null;

    try {
      await document.fonts.ready;

      const logicalWidth = getCanvasLogicalWidth(
        canvas,
        exportPreset.targetWidth,
      );
      const logicalHeight = Math.max(
        measureStaticTextHeight(currentTransitions[0].fromStep.code),
        ...currentTransitions.flatMap((item) => [
          measureStaticTextHeight(item.toStep.code),
          measureTransitionMaxHeight(
            item.fromStep.code,
            item.toStep.code,
            item.settings,
          ),
        ]),
      );
      const { canvas: exportCanvas, cleanup } =
        createHiddenExportCanvas(logicalWidth);
      cleanupExportCanvas = cleanup;

      exportAnimator = new CanvasAnimator(exportCanvas);
      exportAnimator.colors = { ...colors };
      exportAnimator.updateDpr(
        Math.max(1, exportPreset.targetWidth / logicalWidth),
      );
      exportAnimator.setFixedViewport({
        width: logicalWidth,
        height: logicalHeight,
      });

      const manualStream = exportCanvas.captureStream(0);
      const manualTrack =
        (manualStream.getVideoTracks()[0] as MediaStreamTrack & {
          requestFrame?: () => void;
        }) ?? null;

      if (typeof manualTrack?.requestFrame === "function") {
        stream = manualStream;
        exportTrack = manualTrack;
        exportAnimator.setDrawListener(() => exportTrack?.requestFrame?.());
      } else {
        manualStream.getTracks().forEach((track) => track.stop());
        stream = exportCanvas.captureStream();
      }

      exportAnimator.drawStaticText(currentTransitions[0].fromStep.code);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: exportPreset.bitrate,
      });
      const activeRecorder = recorder;
      const chunks: Blob[] = [];

      activeRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      const done = new Promise<void>((resolve) => {
        activeRecorder.onstop = () => resolve();
      });

      activeRecorder.start();
      exportTrack?.requestFrame?.();
      await sleep(EXPORT_WARMUP_MS);

      const completed = await playTransitionSequence(
        exportAnimator,
        currentTransitions,
        {
          onProgress: setProgress,
          onStepLabel: setStepLabel,
        },
      );
      if (completed) setProgress(1);
      exportAnimator.halt();
      setStepLabel("");

      await sleep(EXPORT_TAIL_MS);
      activeRecorder.stop();
      await done;

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        `code-animation-${exportPreset.id}.` +
        (mimeType.includes("webm") ? "webm" : "mp4");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      exportAnimator?.halt();
      exportAnimator?.setDrawListener(null);
      exportAnimator?.setFixedViewport(null);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream?.getTracks().forEach((track) => track.stop());
      cleanupExportCanvas?.();
      setRunning(false);
      setStepLabel("");
      setExporting(false);
    }
  }, [colors, exportPreset, halt, playTransitionSequence]);

  const updateStep = (stepId: string, value: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, code: value } : step,
      ),
    );
  };

  const addStep = () => {
    const newStep: StepItem = {
      id: `step-${nextStepIdRef.current}`,
      code: "",
    };

    const previousStep = steps[steps.length - 1];
    nextStepIdRef.current += 1;
    setSteps((prev) => [...prev, newStep]);
    if (previousStep) {
      const transitionId = getTransitionKey(previousStep.id, newStep.id);
      setTransitionSettings((prev) => ({
        ...prev,
        [transitionId]: prev[transitionId] ?? {
          ...DEFAULT_TRANSITION_SETTINGS,
        },
      }));
    }
    setActiveStepId(newStep.id);
  };

  const removeStep = (stepId: string) => {
    if (steps.length <= 2) return;

    const index = steps.findIndex((step) => step.id === stepId);
    if (index < 0) return;

    const nextSteps = steps.filter((step) => step.id !== stepId);
    setSteps(nextSteps);

    if (resolvedActiveStepId === stepId) {
      const fallback = nextSteps[Math.min(index, nextSteps.length - 1)];
      if (fallback) setActiveStepId(fallback.id);
    }
  };

  const moveStep = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;

    setSteps((prev) => {
      const fromIndex = prev.findIndex((step) => step.id === fromId);
      const toIndex = prev.findIndex((step) => step.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;

      const next = [...prev];
      const [movedStep] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedStep);
      return next;
    });
  }, []);

  const clearDragState = () => {
    setDraggingStepId(null);
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    stepId: string,
  ) => {
    setDraggingStepId(stepId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", stepId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, stepId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggingStepId && draggingStepId !== stepId) {
      moveStep(draggingStepId, stepId);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    clearDragState();
  };

  const handleDropOnTrash = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (draggingStepId && steps.length > 2) {
      removeStep(draggingStepId);
    }
    clearDragState();
  };

  const handleTrashDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const toggleStep = (stepId: string) => {
    if (activeStepId === stepId) {
      setActiveStepId("");
      setActiveTransitionId(null);
    } else {
      setActiveStepId(stepId);
      setActiveTransitionId(null);
    }
  };

  const handleStepCardKey = (
    event: KeyboardEvent<HTMLDivElement>,
    stepId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleStep(stepId);
    }
  };

  const handleCodeTabKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab" || !resolvedActiveStepId) return;

    event.preventDefault();
    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const currentValue = textarea.value;
    const nextValue =
      currentValue.substring(0, selectionStart) +
      "  " +
      currentValue.substring(selectionEnd);

    textarea.value = nextValue;
    textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
    updateStep(resolvedActiveStepId, nextValue);
  };

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[9999]"
        style={{ backgroundImage: NOISE_BACKGROUND }}
      />
      <div className="mx-auto h-full max-w-[1680px]">
        <div className="grid h-full gap-0 min-[821px]:grid-cols-2 min-[1081px]:grid-cols-[minmax(220px,260px)_minmax(360px,1fr)_minmax(320px,0.88fr)] min-[1321px]:grid-cols-[minmax(240px,280px)_minmax(420px,1.05fr)_minmax(360px,0.92fr)]">
          <StoryboardSidebar
            activeStepId={resolvedActiveStepId}
            activeTransitionId={activeTransitionId}
            draggingStepId={draggingStepId}
            steps={steps}
            transitions={transitions}
            onAddStep={addStep}
            onDragEnd={clearDragState}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDropOnTrash={handleDropOnTrash}
            onTrashDragOver={handleTrashDragOver}
            onSelectStep={toggleStep}
            onSelectTransition={selectTransition}
            onStepCardKey={handleStepCardKey}
          />

          <section className="flex h-full min-w-0 flex-col overflow-y-auto">
            {selectedStep &&
              (() => {
                const stepTransition = transitions[resolvedActiveStepIndex];
                return (
                  <>
                    <CodeEditorPanel
                      activeStepIndex={resolvedActiveStepIndex}
                      selectedStep={selectedStep}
                      selectedStepHoldMs={selectedStepHoldMs}
                      stepCount={steps.length}
                      transitionBelow={!!stepTransition}
                      onCodeKeyDown={handleCodeTabKey}
                      onUpdateCode={(value) => {
                        updateStep(selectedStep.id, value);
                      }}
                      onUpdateHoldDuration={(durationMs) => {
                        updateStepHoldDuration(selectedStep.id, durationMs);
                      }}
                    />
                    {stepTransition && (
                      <TransitionPanel
                        transition={stepTransition}
                        onUpdateTransitionSettings={updateTransitionSettings}
                      />
                    )}
                  </>
                );
              })()}
          </section>

          <section className="flex h-full min-w-0 flex-col overflow-y-auto">
            <PreviewPanel
              canvasRef={canvasRef}
              progress={progress}
              running={running}
              stepLabel={stepLabel}
            />
            <PlaybackPanel
              exportPreset={exportPreset}
              exportPresetId={exportPresetId}
              exporting={exporting}
              running={running}
              onAnimateAll={animateAll}
              onExportVideo={exportVideo}
              onPresetChange={setExportPresetId}
              onReset={reset}
            />
            <ColorPanel colors={colors} onUpdateColor={updateColor} />
          </section>
        </div>
      </div>
    </>
  );
}
