import { diffLines, type OpType } from "./diff";

// ---- Config ----
const FONT_SIZE = 14;
const LINE_HEIGHT = 26;
const PAD_X = 28;
const PAD_Y = 24;
const MIN_TRANSITION_MS = 200;

export interface ColorConfig {
  bg: string;
  text: string;
  inserted: string;
  deleted: string;
}

export interface TransitionConfig {
  durationMs: number;
  insertOnly: boolean;
  fuzzyDiff: boolean;
}

interface FixedViewport {
  width: number;
  height: number;
}

const DEFAULT_COLORS: ColorConfig = {
  bg: "#f8fbfc",
  text: "#13232b",
  inserted: "#15803d",
  deleted: "#dc2626",
};

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface LineState {
  text: string;
  type: OpType;
  progress: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function getRenderedLineProgress(type: OpType, progress: number) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;

  if (type === "i") {
    // Give inserted lines a stronger initial reveal so they don't start as a tiny sliver.
    return Math.min(1, 0.18 + easeOutBack(progress) * 0.82);
  }

  if (type === "d") {
    return Math.pow(progress, 0.85);
  }

  return progress;
}

function getRenderedLineAlpha(type: OpType, progress: number) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;

  if (type === "i") {
    return Math.min(1, 0.24 + easeOutCubic(progress) * 0.76);
  }

  if (type === "d") {
    return Math.pow(progress, 0.9);
  }

  return progress;
}

export function measureStaticTextHeight(text: string) {
  const lines = text.split("\n");
  return Math.max(240, PAD_Y * 2 + lines.length * LINE_HEIGHT);
}

export function measureTransitionMaxHeight(
  before: string,
  after: string,
  config: TransitionConfig
) {
  const ops = diffLines(before, after, config.fuzzyDiff);
  return Math.max(240, PAD_Y * 2 + ops.length * LINE_HEIGHT);
}

export class CanvasAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private rafId: number | null = null;
  private fixedViewport: FixedViewport | null = null;
  private drawListener: (() => void) | null = null;
  private monoFont: string;
  private sansFont: string;
  colors: ColorConfig = { ...DEFAULT_COLORS };
  running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.dpr = window.devicePixelRatio || 1;
    this.monoFont = `${FONT_SIZE}px monospace`;
    this.sansFont = `14px sans-serif`;
    this.resolveFont();
  }

  private resolveFont() {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const monoFamily = style.getPropertyValue("--font-jetbrains-mono").trim();
    const sansFamily = style.getPropertyValue("--font-dm-sans").trim();
    this.monoFont = `${FONT_SIZE}px ${monoFamily || '"JetBrains Mono"'}, monospace`;
    this.sansFont = `14px ${sansFamily || '"DM Sans"'}, sans-serif`;
  }

  updateDpr(nextDpr?: number) {
    const resolvedDpr = nextDpr ?? window.devicePixelRatio;
    this.dpr = resolvedDpr || 1;
    this.resolveFont();
  }

  setFixedViewport(viewport?: FixedViewport | null) {
    this.fixedViewport = viewport ?? null;
  }

  setDrawListener(listener?: (() => void) | null) {
    this.drawListener = listener ?? null;
  }

  private notifyDraw() {
    this.drawListener?.();
  }

  private sizeCanvas(h: number) {
    const w = this.fixedViewport?.width ?? this.canvas.parentElement!.clientWidth;
    const height = this.fixedViewport?.height ?? h;
    this.canvas.width = Math.max(1, Math.round(w * this.dpr));
    this.canvas.height = Math.max(1, Math.round(height * this.dpr));
    this.canvas.style.width = w + "px";
    this.canvas.style.height = height + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private clearCanvas(h: number) {
    const height = this.fixedViewport?.height ?? h;
    this.ctx.fillStyle = this.colors.bg;
    this.ctx.fillRect(0, 0, this.canvas.width / this.dpr, height);
  }

  private drawLines(lines: LineState[], insertOnly = false) {
    const ctx = this.ctx;
    ctx.font = this.monoFont;
    ctx.textBaseline = "top";

    let totalH = PAD_Y;
    for (const line of lines) {
      if (insertOnly && line.type === "d") continue;
      const renderProgress = getRenderedLineProgress(line.type, line.progress);
      totalH +=
        line.type === "d" || line.type === "i"
          ? LINE_HEIGHT * renderProgress
          : LINE_HEIGHT;
    }
    totalH = Math.max(240, totalH + PAD_Y);

    this.sizeCanvas(totalH);
    this.clearCanvas(totalH);
    ctx.font = this.monoFont;
    ctx.textBaseline = "top";

    let y = PAD_Y;
    const cw = this.canvas.width / this.dpr;

    const { text: colText, inserted, deleted } = this.colors;

    for (const line of lines) {
      if (insertOnly && line.type === "d") continue;

      const text = line.text || "";

      if (line.type === "k") {
        ctx.globalAlpha = 1;
        ctx.fillStyle = colText;
        ctx.fillText(text, PAD_X, y + (LINE_HEIGHT - FONT_SIZE) / 2);
        y += LINE_HEIGHT;
      } else if (line.type === "d") {
        const renderProgress = getRenderedLineProgress(line.type, line.progress);
        const renderAlpha = getRenderedLineAlpha(line.type, line.progress);
        const h = LINE_HEIGHT * renderProgress;
        if (h < 0.5) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, cw, h);
        ctx.clip();
        ctx.globalAlpha = renderAlpha * 0.6;
        ctx.fillStyle = withAlpha(deleted, 0.1);
        ctx.fillRect(0, y, cw, LINE_HEIGHT);
        ctx.globalAlpha = renderAlpha;
        ctx.fillStyle = deleted;
        ctx.fillText(text, PAD_X, y + (LINE_HEIGHT - FONT_SIZE) / 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        y += h;
      } else if (line.type === "i") {
        const renderProgress = getRenderedLineProgress(line.type, line.progress);
        const renderAlpha = getRenderedLineAlpha(line.type, line.progress);
        const h = LINE_HEIGHT * renderProgress;
        if (h < 0.5) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, cw, h);
        ctx.clip();
        ctx.globalAlpha = renderAlpha * 0.6;
        ctx.fillStyle = withAlpha(inserted, 0.1);
        ctx.fillRect(0, y, cw, LINE_HEIGHT);
        ctx.globalAlpha = renderAlpha;
        ctx.fillStyle = inserted;
        ctx.fillText(text, PAD_X, y + (LINE_HEIGHT - FONT_SIZE) / 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        y += h;
      }
    }

    this.notifyDraw();
  }

  drawStaticText(text: string) {
    const lines = text.split("\n");
    const h = measureStaticTextHeight(text);
    this.sizeCanvas(h);
    this.clearCanvas(h);
    this.ctx.font = this.monoFont;
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = this.colors.text;
    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(
        lines[i],
        PAD_X,
        PAD_Y + i * LINE_HEIGHT + (LINE_HEIGHT - FONT_SIZE) / 2
      );
    }

    this.notifyDraw();
  }

  drawPlaceholder() {
    this.sizeCanvas(240);
    this.clearCanvas(240);
    this.ctx.font = this.sansFont;
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = withAlpha(this.colors.text, 0.35);
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillText(
      "Press Animate All to see the transitions...",
      PAD_X,
      PAD_Y + (LINE_HEIGHT - FONT_SIZE) / 2
    );
    this.ctx.globalAlpha = 1;
    this.notifyDraw();
  }

  halt() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.running = false;
  }

  holdFrame(
    text: string,
    durationMs: number,
    progressCb: (p: number) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const totalDuration = Math.max(0, durationMs);

      this.drawStaticText(text);

      if (totalDuration === 0) {
        this.rafId = null;
        progressCb(1);
        resolve();
        return;
      }

      const startTime = performance.now();

      const tick = (now: number) => {
        if (!this.running) {
          this.rafId = null;
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / totalDuration);
        progressCb(progress);

        if (progress >= 1) {
          this.rafId = null;
          resolve();
          return;
        }

        this.rafId = requestAnimationFrame(tick);
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  animateTransition(
    before: string,
    after: string,
    config: TransitionConfig,
    progressCb: (p: number) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const totalDuration = Math.max(MIN_TRANSITION_MS, config.durationMs);
      const ops = diffLines(before, after, config.fuzzyDiff);
      const skipDel = config.insertOnly;
      const hasAnimatedLines = ops.some(
        (op) => op.t === "i" || (!skipDel && op.t === "d")
      );

      if (!hasAnimatedLines) {
        this.drawStaticText(after);
        this.rafId = null;
        progressCb(1);
        resolve();
        return;
      }

      const lineStates: LineState[] = ops.map((op) => ({
        text: op.v,
        type: op.t,
        progress: op.t === "i" ? 0 : (skipDel && op.t === "d" ? 0 : 1),
      }));
      const startTime = performance.now();
      this.drawLines(lineStates, skipDel);

      const tick = (now: number) => {
        if (!this.running) {
          this.rafId = null;
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / totalDuration);
        const eased = easeOutCubic(progress);
        for (const ls of lineStates) {
          if (ls.type === "d") ls.progress = skipDel ? 0 : 1 - eased;
          else if (ls.type === "i") ls.progress = eased;
        }

        this.drawLines(lineStates, skipDel);
        progressCb(progress);

        if (progress < 1) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.drawStaticText(after);
          this.rafId = null;
          progressCb(1);
          resolve();
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }
}
