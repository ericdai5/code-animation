import { diffLines, type OpType } from "./diff";

// ---- Config ----
const FONT_SIZE = 14;
const LINE_HEIGHT = 26;
const PAD_X = 28;
const PAD_Y = 24;
const ANIM_DURATION = 350;

const COL_BG = "#131318";
const COL_TEXT = "#e4e4ef";
const COL_DIM = "#6e6e8a";
const COL_GREEN = "#4ade80";
const COL_GREEN_BG = "rgba(74,222,128,0.10)";
const COL_RED = "#f87171";
const COL_RED_BG = "rgba(248,113,113,0.10)";

interface LineState {
  text: string;
  type: OpType;
  progress: number;
  animating: boolean;
  animStart: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class CanvasAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private rafId: number | null = null;
  private monoFont: string;
  private sansFont: string;
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
    const monoFamily = style.getPropertyValue("--font-mono").trim();
    const sansFamily = style.getPropertyValue("--font-dm-sans").trim();
    this.monoFont = `${FONT_SIZE}px ${monoFamily || '"JetBrains Mono"'}, monospace`;
    this.sansFont = `14px ${sansFamily || '"DM Sans"'}, sans-serif`;
  }

  updateDpr() {
    this.dpr = window.devicePixelRatio || 1;
    this.resolveFont();
  }

  private sizeCanvas(h: number) {
    const w = this.canvas.parentElement!.clientWidth;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private clearCanvas(h: number) {
    this.ctx.fillStyle = COL_BG;
    this.ctx.fillRect(0, 0, this.canvas.width / this.dpr, h);
  }

  private drawLines(lines: LineState[]) {
    const ctx = this.ctx;
    ctx.font = this.monoFont;
    ctx.textBaseline = "top";

    let totalH = PAD_Y;
    for (const line of lines) {
      totalH +=
        line.type === "d" || line.type === "i"
          ? LINE_HEIGHT * line.progress
          : LINE_HEIGHT;
    }
    totalH = Math.max(240, totalH + PAD_Y);

    this.sizeCanvas(totalH);
    this.clearCanvas(totalH);
    ctx.font = this.monoFont;
    ctx.textBaseline = "top";

    let y = PAD_Y;
    const cw = this.canvas.width / this.dpr;

    for (const line of lines) {
      const text = line.text || "";

      if (line.type === "k") {
        ctx.globalAlpha = 1;
        ctx.fillStyle = COL_TEXT;
        ctx.fillText(text, PAD_X, y + (LINE_HEIGHT - FONT_SIZE) / 2);
        y += LINE_HEIGHT;
      } else if (line.type === "d") {
        const h = LINE_HEIGHT * line.progress;
        if (h < 0.5) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, cw, h);
        ctx.clip();
        ctx.globalAlpha = line.progress * 0.6;
        ctx.fillStyle = COL_RED_BG;
        ctx.fillRect(0, y, cw, LINE_HEIGHT);
        ctx.globalAlpha = line.progress;
        ctx.fillStyle = COL_RED;
        ctx.fillText(text, PAD_X, y + (LINE_HEIGHT - FONT_SIZE) / 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        y += h;
      } else if (line.type === "i") {
        const h = LINE_HEIGHT * line.progress;
        if (h < 0.5) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, cw, h);
        ctx.clip();
        ctx.globalAlpha = line.progress * 0.6;
        ctx.fillStyle = COL_GREEN_BG;
        ctx.fillRect(0, y, cw, LINE_HEIGHT);
        ctx.globalAlpha = line.progress;
        ctx.fillStyle = COL_GREEN;
        ctx.fillText(text, PAD_X, y + (LINE_HEIGHT - FONT_SIZE) / 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        y += h;
      }
    }
  }

  drawStaticText(text: string) {
    const lines = text.split("\n");
    const h = Math.max(240, PAD_Y * 2 + lines.length * LINE_HEIGHT);
    this.sizeCanvas(h);
    this.clearCanvas(h);
    this.ctx.font = this.monoFont;
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = COL_TEXT;
    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(
        lines[i],
        PAD_X,
        PAD_Y + i * LINE_HEIGHT + (LINE_HEIGHT - FONT_SIZE) / 2
      );
    }
  }

  drawPlaceholder() {
    this.sizeCanvas(240);
    this.clearCanvas(240);
    this.ctx.font = this.sansFont;
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = COL_DIM;
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillText(
      "Press Animate All to see the transitions...",
      PAD_X,
      PAD_Y + (LINE_HEIGHT - FONT_SIZE) / 2
    );
    this.ctx.globalAlpha = 1;
  }

  halt() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.running = false;
  }

  animateTransition(
    before: string,
    after: string,
    lineDelay: number,
    progressCb: (p: number) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const ops = diffLines(before, after);
      const delOps: number[] = [];
      const insOps: number[] = [];
      ops.forEach((op, i) => {
        if (op.t === "d") delOps.push(i);
        if (op.t === "i") insOps.push(i);
      });
      const totalSteps = delOps.length + insOps.length;

      if (totalSteps === 0) {
        this.drawStaticText(after);
        progressCb(1);
        resolve();
        return;
      }

      const lineStates: LineState[] = ops.map((op) => ({
        text: op.v,
        type: op.t,
        progress: op.t === "i" ? 0 : 1,
        animating: false,
        animStart: 0,
      }));

      let step = 0;
      const startTime = performance.now();
      this.drawLines(lineStates);

      const tick = (now: number) => {
        if (!this.running) {
          resolve();
          return;
        }

        const elapsed = now - startTime - 300;
        if (elapsed < 0) {
          this.rafId = requestAnimationFrame(tick);
          return;
        }

        const targetStep = Math.min(
          totalSteps,
          Math.floor(elapsed / lineDelay) + 1
        );

        while (step < targetStep) {
          if (step < delOps.length) {
            lineStates[delOps[step]].animating = true;
            lineStates[delOps[step]].animStart = now;
          } else {
            const idx = insOps[step - delOps.length];
            lineStates[idx].animating = true;
            lineStates[idx].animStart = now;
          }
          step++;
        }

        let anyAnimating = false;
        for (const ls of lineStates) {
          if (!ls.animating) continue;
          const t = Math.min(1, (now - ls.animStart) / ANIM_DURATION);
          const eased = easeOutCubic(t);
          if (ls.type === "d") ls.progress = 1 - eased;
          else if (ls.type === "i") ls.progress = eased;
          if (t >= 1) {
            ls.animating = false;
            ls.progress = ls.type === "d" ? 0 : 1;
          } else {
            anyAnimating = true;
          }
        }

        this.drawLines(lineStates);
        progressCb(Math.min(step, totalSteps) / totalSteps);

        if (step < totalSteps || anyAnimating) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          setTimeout(() => {
            this.drawStaticText(after);
            resolve();
          }, 200);
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }
}
