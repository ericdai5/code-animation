"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasAnimator } from "@/lib/animator";

const DEFAULT_STEPS = [
  'const kineticConfig: Config = {\n  formulas: [\n    id: "kinetic-energy", latex: "K = \\\\frac{1}{2}mv^2",\n  ]\n}',
  'const kineticConfig: Config = {\n  formulas: [\n    id: "kinetic-energy", latex: "K = \\\\frac{1}{2}mv^2",\n  ],\n  variables: {\n    K: { name: "Kinetic Energy" },\n  },\n}',
  'const kineticConfig: Config = {\n  formulas: [\n    id: "kinetic-energy", latex: "K = \\\\frac{1}{2}mv^2",\n  ],\n  variables: {\n    K: { name: "Kinetic Energy", unit: "J" },\n    m: { name: "Mass", unit: "kg" },\n    v: { name: "Velocity", unit: "m/s" },\n  },\n}',
];

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export default function Home() {
  const [steps, setSteps] = useState<string[]>(DEFAULT_STEPS);
  const [activeTab, setActiveTab] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatorRef = useRef<CanvasAnimator | null>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Initialize animator
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

  const lineDelay = useCallback(() => 150 / (speedRef.current / 5), []);

  const halt = useCallback(() => {
    const a = animatorRef.current;
    if (!a) return;
    a.halt();
    setRunning(false);
    setStepLabel("");
  }, []);

  const animateAll = useCallback(async () => {
    const a = animatorRef.current;
    if (!a) return;
    if (a.running) {
      halt();
      return;
    }
    const currentSteps = stepsRef.current;
    if (currentSteps.length < 2) return;

    a.running = true;
    setRunning(true);
    const total = currentSteps.length - 1;

    for (let i = 0; i < total; i++) {
      if (!a.running) break;
      setStepLabel(`Step ${i + 1} \u2192 ${i + 2}`);
      await a.animateTransition(
        currentSteps[i],
        currentSteps[i + 1],
        lineDelay(),
        (p) => setProgress((i + p) / total)
      );
      if (a.running && i < total - 1) {
        await new Promise<void>((r) => setTimeout(r, 500));
      }
    }

    if (a.running) {
      setProgress(1);
      halt();
    }
  }, [halt, lineDelay]);

  const reset = useCallback(() => {
    halt();
    animatorRef.current?.drawPlaceholder();
    setProgress(0);
  }, [halt]);

  const exportVideo = useCallback(async () => {
    const a = animatorRef.current;
    const canvas = canvasRef.current;
    if (!a || !canvas) return;
    const currentSteps = stepsRef.current;
    if (currentSteps.length < 2) return;
    if (a.running) halt();

    setExporting(true);

    a.drawStaticText(currentSteps[0]);
    await new Promise<void>((r) => setTimeout(r, 100));

    const stream = canvas.captureStream(60);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const done = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start();
    a.running = true;
    setRunning(true);
    const total = currentSteps.length - 1;

    for (let i = 0; i < total; i++) {
      if (!a.running) break;
      setStepLabel(`Step ${i + 1} \u2192 ${i + 2}`);
      await a.animateTransition(
        currentSteps[i],
        currentSteps[i + 1],
        lineDelay(),
        (p) => setProgress((i + p) / total)
      );
      if (a.running && i < total - 1) {
        await new Promise<void>((r) => setTimeout(r, 500));
      }
    }

    if (a.running) setProgress(1);
    halt();

    await new Promise<void>((r) => setTimeout(r, 500));
    recorder.stop();
    await done;

    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      "code-animation." + (mimeType.includes("webm") ? "webm" : "mp4");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExporting(false);
  }, [halt, lineDelay]);

  const updateStep = (idx: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? value : s)));
  };

  const addStep = () => {
    setSteps((prev) => [...prev, ""]);
    setActiveTab(steps.length);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 2) return;
    setSteps((prev) => prev.filter((_, i) => i !== idx));
    setActiveTab((prev) => Math.min(prev, steps.length - 2));
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, s) + "  " + val.substring(end);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = s + 2;
      updateStep(activeTab, newVal);
    }
  };

  return (
    <>
      <div className="noise" />
      <div className="app">
        <div className="header">
          <h1>
            Code <em>Transition</em> Animator
          </h1>
          <p>
            Add a series of code snapshots and watch each transition animate in
            sequence.
          </p>
        </div>

        {/* Steps */}
        <div className="steps-container">
          <div className="steps-tabs">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`step-tab${i === activeTab ? " active" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                <span className="step-num">{i + 1}</span>
                <span className="step-label">Step {i + 1}</span>
                {steps.length > 2 && (
                  <button
                    className="step-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStep(i);
                    }}
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="steps-panels">
            {steps.map((code, i) => (
              <div
                key={i}
                className={`step-panel${i === activeTab ? " active" : ""}`}
              >
                <textarea
                  spellCheck={false}
                  placeholder={`Paste code for step ${i + 1}...`}
                  value={code}
                  onChange={(e) => updateStep(i, e.target.value)}
                  onKeyDown={handleTabKey}
                />
              </div>
            ))}
          </div>
          <button className="btn btn-add" onClick={addStep}>
            <PlusIcon />
            Add Step
          </button>
        </div>

        {/* Controls */}
        <div className="controls">
          <button className="btn btn-primary" onClick={animateAll}>
            {running ? <PauseIcon /> : <PlayIcon />}
            {running ? "Pause" : "Animate All"}
          </button>
          <button className="btn btn-ghost" onClick={reset}>
            <ResetIcon />
            Reset
          </button>
          <button
            className="btn btn-export"
            onClick={exportVideo}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <span className="rec-dot" />
                Recording&hellip;
              </>
            ) : (
              <>
                <ExportIcon />
                Export Video
              </>
            )}
          </button>
          <div className="speed-w">
            <label>Speed</label>
            <input
              type="range"
              min={1}
              max={10}
              value={speed}
              step={1}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            <span className="speed-v">{(speed / 5).toFixed(1)}x</span>
          </div>
        </div>

        {/* Preview */}
        <div className="preview-wrap">
          <div className="preview-bar">
            <span className="ttl">
              <span className={`live-dot${running ? " on" : ""}`} />
              Preview
            </span>
            <span className="step-indicator">{stepLabel}</span>
            <div className="prog-track">
              <div
                className="prog-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <div className="canvas-container">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </>
  );
}
