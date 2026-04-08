import { diffLines, type OpType } from "./diff";

// ---- Config ----
const FONT_SIZE = 14;
const PAD_X = 28;
const PAD_Y = 24;
const MIN_TRANSITION_MS = 200;

export interface ColorConfig {
  bg: string;
  text: string;
  inserted: string;
  deleted: string;
}

export type HighlightMode = "none" | "line" | "inline";
export const CODE_FONT_WEIGHT_OPTIONS = [400, 500, 700] as const;
export type CodeFontWeight = (typeof CODE_FONT_WEIGHT_OPTIONS)[number];
export const CODE_LINE_SPACING_MIN = 1;
export const CODE_LINE_SPACING_MAX = 2.4;
export const CODE_LINE_SPACING_STEP = 0.05;
export const CODE_LETTER_SPACING_MIN = -0.5;
export const CODE_LETTER_SPACING_MAX = 2;
export const CODE_LETTER_SPACING_STEP = 0.05;

export interface TypographyConfig {
  codeFontWeight: CodeFontWeight;
  codeLineSpacing: number;
  codeLetterSpacing: number;
}

export interface TransitionConfig {
  durationMs: number;
  insertOnly: boolean;
  fuzzyDiff: boolean;
  highlight: HighlightMode;
  nextStepPersistence: boolean;
}

interface FixedViewport {
  width: number;
  height: number;
}

interface ReplaceLineSegments {
  prefix: string;
  removed: string;
  added: string;
  suffix: string;
}

type BaseAnimationOp = ReturnType<typeof diffLines>[number];
type AnimationOpType = OpType | "r";
type AnimationDiffOp =
  | BaseAnimationOp
  | { t: "r"; v: string; segments: ReplaceLineSegments };

const DEFAULT_COLORS: ColorConfig = {
  bg: "#ffffff",
  text: "#969696",
  inserted: "#000000",
  deleted: "#dc2626",
};

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  codeFontWeight: 500,
  codeLineSpacing: 1.4,
  codeLetterSpacing: -0.3,
};

export function normalizeTypographyConfig(
  config?: Partial<TypographyConfig>
): TypographyConfig {
  const codeFontWeight = config?.codeFontWeight;
  const codeLineSpacing = config?.codeLineSpacing;
  const codeLetterSpacing = config?.codeLetterSpacing;

  return {
    codeFontWeight: CODE_FONT_WEIGHT_OPTIONS.includes(
      codeFontWeight as CodeFontWeight
    )
      ? (codeFontWeight as CodeFontWeight)
      : DEFAULT_TYPOGRAPHY.codeFontWeight,
    codeLineSpacing:
      typeof codeLineSpacing === "number" && Number.isFinite(codeLineSpacing)
        ? Math.min(
            CODE_LINE_SPACING_MAX,
            Math.max(CODE_LINE_SPACING_MIN, roundStyleValue(codeLineSpacing))
          )
        : DEFAULT_TYPOGRAPHY.codeLineSpacing,
    codeLetterSpacing:
      typeof codeLetterSpacing === "number" && Number.isFinite(codeLetterSpacing)
        ? Math.min(
            CODE_LETTER_SPACING_MAX,
            Math.max(
              CODE_LETTER_SPACING_MIN,
              roundStyleValue(codeLetterSpacing)
            )
          )
        : DEFAULT_TYPOGRAPHY.codeLetterSpacing,
  };
}

function roundStyleValue(value: number) {
  return Math.round(value * 100) / 100;
}

function getCodeLineHeightPx(typography: TypographyConfig) {
  return FONT_SIZE * typography.codeLineSpacing;
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface StaticLineState {
  text: string;
  type: OpType;
  progress: number;
}

interface ReplaceLineState {
  text: string;
  type: "r";
  progress: number;
  segments: ReplaceLineSegments;
  metrics: ReplaceLineMetrics;
}

type LineState = StaticLineState | ReplaceLineState;

interface ReplaceLineMetrics {
  prefixWidth: number;
  removedWidth: number;
  addedWidth: number;
  removedEndWidth: number;
  addedEndWidth: number;
}

function getReplaceLineSegments(
  beforeText: string,
  afterText: string
): ReplaceLineSegments {
  const maxPrefix = Math.min(beforeText.length, afterText.length);
  let prefixLen = 0;

  while (
    prefixLen < maxPrefix &&
    beforeText[prefixLen] === afterText[prefixLen]
  ) {
    prefixLen += 1;
  }

  const maxSuffix = Math.min(
    beforeText.length - prefixLen,
    afterText.length - prefixLen
  );
  let suffixLen = 0;

  while (
    suffixLen < maxSuffix &&
    beforeText[beforeText.length - 1 - suffixLen] ===
      afterText[afterText.length - 1 - suffixLen]
  ) {
    suffixLen += 1;
  }

  return {
    prefix: afterText.slice(0, prefixLen),
    removed: beforeText.slice(prefixLen, beforeText.length - suffixLen),
    added: afterText.slice(prefixLen, afterText.length - suffixLen),
    suffix: afterText.slice(afterText.length - suffixLen),
  };
}

function isInlineChangeCandidate(segments: ReplaceLineSegments) {
  const beforeLength =
    segments.prefix.length + segments.removed.length + segments.suffix.length;
  const afterLength =
    segments.prefix.length + segments.added.length + segments.suffix.length;
  const sharedEdgeLength = segments.prefix.length + segments.suffix.length;
  const shortestLength = Math.min(beforeLength, afterLength);

  return (
    shortestLength > 0 &&
    sharedEdgeLength > 0 &&
    sharedEdgeLength >= Math.ceil(shortestLength / 2)
  );
}

function buildAnimationOps(
  before: string,
  after: string,
  fuzzyDiff: boolean
): AnimationDiffOp[] {
  const baseOps = diffLines(before, after, fuzzyDiff);

  if (fuzzyDiff) return baseOps;

  const animationOps: AnimationDiffOp[] = [];

  for (let index = 0; index < baseOps.length; ) {
    const current = baseOps[index];

    if (current.t === "k") {
      animationOps.push(current);
      index += 1;
      continue;
    }

    const block: BaseAnimationOp[] = [];
    while (index < baseOps.length && baseOps[index].t !== "k") {
      block.push(baseOps[index]);
      index += 1;
    }

    const inserts: BaseAnimationOp[] = [];
    const deletes: BaseAnimationOp[] = [];

    for (const op of block) {
      if (op.t === "i") inserts.push(op);
      else if (op.t === "d") deletes.push(op);
    }

    if (inserts.length === 0 || deletes.length === 0) {
      animationOps.push(...block);
      continue;
    }

    const pairCount = Math.min(inserts.length, deletes.length);
    const replacements: AnimationDiffOp[] = [];
    let canInlineAnimateBlock = true;

    // Convert exact diff replacement blocks into single rows so the unchanged
    // suffix can slide open before the inserted text fades in.
    for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
      const segments = getReplaceLineSegments(
        deletes[pairIndex].v,
        inserts[pairIndex].v
      );

      if (!isInlineChangeCandidate(segments)) {
        canInlineAnimateBlock = false;
        break;
      }

      replacements.push({
        t: "r",
        v: inserts[pairIndex].v,
        segments,
      });
    }

    if (!canInlineAnimateBlock) {
      animationOps.push(...block);
      continue;
    }

    animationOps.push(
      ...replacements,
      ...inserts.slice(pairCount),
      ...deletes.slice(pairCount)
    );
  }

  return animationOps;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function getRenderedLineProgress(type: AnimationOpType, progress: number) {
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

function getRenderedLineAlpha(type: AnimationOpType, progress: number) {
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

export function measureStaticTextHeight(
  text: string,
  typography: TypographyConfig = DEFAULT_TYPOGRAPHY
) {
  const lines = text.split("\n");
  return Math.max(240, PAD_Y * 2 + lines.length * getCodeLineHeightPx(typography));
}

export function measureTransitionMaxHeight(
  before: string,
  after: string,
  config: TransitionConfig,
  typography: TypographyConfig = DEFAULT_TYPOGRAPHY
) {
  const ops = buildAnimationOps(before, after, config.fuzzyDiff);
  return Math.max(240, PAD_Y * 2 + ops.length * getCodeLineHeightPx(typography));
}

export class CanvasAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private rafId: number | null = null;
  private fixedViewport: FixedViewport | null = null;
  private drawListener: (() => void) | null = null;
  private typographyConfig: TypographyConfig;
  private monoFont: string;
  private sansFont: string;
  private textWidthCache = new Map<string, number>();
  colors: ColorConfig = { ...DEFAULT_COLORS };
  running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.dpr = window.devicePixelRatio || 1;
    this.typographyConfig = { ...DEFAULT_TYPOGRAPHY };
    this.monoFont = `${FONT_SIZE}px monospace`;
    this.sansFont = `14px sans-serif`;
    this.resolveFont();
  }

  get typography() {
    return this.typographyConfig;
  }

  set typography(nextTypography: TypographyConfig) {
    this.typographyConfig = normalizeTypographyConfig(nextTypography);
    this.textWidthCache.clear();
    this.resolveFont();
  }

  private resolveFont() {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const monoFamily = style.getPropertyValue("--font-jetbrains-mono").trim();
    const sansFamily = style.getPropertyValue("--font-dm-sans").trim();
    const { codeFontWeight } = this.typographyConfig;
    this.monoFont = `${codeFontWeight} ${FONT_SIZE}px ${monoFamily || '"JetBrains Mono"'}, monospace`;
    this.sansFont = `500 14px ${sansFamily || '"DM Sans"'}, sans-serif`;
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

  private getCodeLineHeight() {
    return getCodeLineHeightPx(this.typographyConfig);
  }

  private getCodeLetterSpacing() {
    return this.typographyConfig.codeLetterSpacing;
  }

  private getCodeTextY(y: number) {
    return y + (this.getCodeLineHeight() - FONT_SIZE) / 2;
  }

  private drawCodeText(text: string, x: number, y: number) {
    if (!text) return;

    const letterSpacing = this.getCodeLetterSpacing();

    if (letterSpacing === 0) {
      this.ctx.fillText(text, x, y);
      return;
    }

    let cursorX = x;
    const graphemes = Array.from(text);

    graphemes.forEach((grapheme, index) => {
      this.ctx.fillText(grapheme, cursorX, y);
      cursorX += this.ctx.measureText(grapheme).width;

      if (index < graphemes.length - 1) {
        cursorX += letterSpacing;
      }
    });
  }

  private measureInlineWidth(text: string) {
    if (!text) return 0;

    const cacheKey = `${this.monoFont}\u0000${this.getCodeLetterSpacing()}\u0000${text}`;
    const cached = this.textWidthCache.get(cacheKey);
    if (cached !== undefined) return cached;

    this.ctx.font = this.monoFont;
    const graphemes = Array.from(text);
    const letterSpacing = this.getCodeLetterSpacing();
    let width = 0;

    graphemes.forEach((grapheme, index) => {
      width += this.ctx.measureText(grapheme).width;
      if (index < graphemes.length - 1) {
        width += letterSpacing;
      }
    });

    const resolvedWidth = Math.max(0, width);
    this.textWidthCache.set(cacheKey, resolvedWidth);
    return resolvedWidth;
  }

  private getReplaceLineMetrics(
    segments: ReplaceLineSegments
  ): ReplaceLineMetrics {
    const prefixWidth = this.measureInlineWidth(segments.prefix);
    const removedEndWidth = this.measureInlineWidth(
      segments.prefix + segments.removed
    );
    const addedEndWidth = this.measureInlineWidth(
      segments.prefix + segments.added
    );

    return {
      prefixWidth,
      removedWidth: Math.max(0, removedEndWidth - prefixWidth),
      addedWidth: Math.max(0, addedEndWidth - prefixWidth),
      removedEndWidth,
      addedEndWidth,
    };
  }

  private buildSettledLineStates(
    before: string,
    after: string,
    config: TransitionConfig
  ): LineState[] {
    const ops = buildAnimationOps(before, after, config.fuzzyDiff);
    const lineStates: LineState[] = [];

    for (const op of ops) {
      if (op.t === "d") continue;

      if (op.t === "r") {
        lineStates.push({
          text: op.v,
          type: "r",
          progress: 1,
          segments: op.segments,
          metrics: this.getReplaceLineMetrics(op.segments),
        });
        continue;
      }

      lineStates.push({
        text: op.v,
        type: op.t,
        progress: 1,
      });
    }

    return lineStates;
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

  private drawReplaceLine(line: ReplaceLineState, y: number, insertOnly = false, highlight: HighlightMode = "line") {
    const ctx = this.ctx;
    const lineHeight = this.getCodeLineHeight();
    const { text: colText, inserted, deleted } = this.colors;
    const { prefix, removed, added, suffix } = line.segments;
    const {
      prefixWidth,
      removedWidth,
      addedWidth,
      removedEndWidth,
      addedEndWidth,
    } = line.metrics;
    const progress = Math.max(0, Math.min(1, line.progress));
    const shiftProgress = easeOutCubic(Math.min(1, progress / 0.45));
    const insertProgress =
      progress <= 0.16 ? 0 : easeOutCubic((progress - 0.16) / 0.84);
    const removeAlpha = Math.max(0, 1 - Math.min(1, progress / 0.62));
    const textY = this.getCodeTextY(y);
    const baseX = PAD_X;
    const segmentX = baseX + prefixWidth;
    const suffixOldX = baseX + removedEndWidth;
    const suffixNewX = baseX + addedEndWidth;
    const suffixX = suffixOldX + (suffixNewX - suffixOldX) * shiftProgress;

    // Background highlights
    if (highlight === "line") {
      ctx.globalAlpha = Math.max(insertProgress, removeAlpha) * 0.6;
      ctx.fillStyle = withAlpha(inserted, 0.1);
      ctx.fillRect(0, y, this.canvas.width / this.dpr, lineHeight);
    } else if (highlight === "inline") {
      if (removed && removeAlpha > 0.001) {
        ctx.globalAlpha = removeAlpha * 0.6;
        ctx.fillStyle = withAlpha(deleted, 0.1);
        ctx.fillRect(segmentX, y, removedWidth, lineHeight);
      }
      if (added && insertProgress > 0.001) {
        ctx.globalAlpha = insertProgress * 0.6;
        ctx.fillStyle = withAlpha(inserted, 0.1);
        ctx.fillRect(segmentX, y, addedWidth * insertProgress, lineHeight);
      }
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = colText;
    this.drawCodeText(prefix, baseX, textY);

    if (removed && removeAlpha > 0.001) {
      ctx.globalAlpha = removeAlpha;
      ctx.fillStyle = insertOnly ? colText : deleted;
      this.drawCodeText(removed, segmentX, textY);
    }

    if (added && insertProgress > 0.001) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(segmentX, y, addedWidth * insertProgress, lineHeight);
      ctx.clip();
      ctx.globalAlpha = insertProgress;
      ctx.fillStyle = inserted;
      this.drawCodeText(added, segmentX, textY);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = colText;
    this.drawCodeText(suffix, suffixX, textY);
    ctx.globalAlpha = 1;
  }

  private drawLines(lines: LineState[], insertOnly = false, highlight: HighlightMode = "line") {
    const ctx = this.ctx;
    ctx.font = this.monoFont;
    ctx.textBaseline = "top";
    const lineHeight = this.getCodeLineHeight();

    let totalH = PAD_Y;
    for (const line of lines) {
      if (insertOnly && line.type === "d") continue;
      const renderProgress = getRenderedLineProgress(line.type, line.progress);
      totalH +=
        line.type === "d" || line.type === "i"
          ? lineHeight * renderProgress
          : lineHeight;
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
        this.drawCodeText(text, PAD_X, this.getCodeTextY(y));
        y += lineHeight;
      } else if (line.type === "d") {
        const renderProgress = getRenderedLineProgress(line.type, line.progress);
        const renderAlpha = getRenderedLineAlpha(line.type, line.progress);
        const h = lineHeight * renderProgress;
        if (h < 0.5) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, cw, h);
        ctx.clip();
        if (highlight === "line") {
          ctx.globalAlpha = renderAlpha * 0.6;
          ctx.fillStyle = withAlpha(deleted, 0.1);
          ctx.fillRect(0, y, cw, lineHeight);
        }
        ctx.globalAlpha = renderAlpha;
        ctx.fillStyle = deleted;
        this.drawCodeText(text, PAD_X, this.getCodeTextY(y));
        ctx.restore();
        ctx.globalAlpha = 1;
        y += h;
      } else if (line.type === "i") {
        const renderProgress = getRenderedLineProgress(line.type, line.progress);
        const renderAlpha = getRenderedLineAlpha(line.type, line.progress);
        const h = lineHeight * renderProgress;
        if (h < 0.5) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, cw, h);
        ctx.clip();
        if (highlight === "line") {
          ctx.globalAlpha = renderAlpha * 0.6;
          ctx.fillStyle = withAlpha(inserted, 0.1);
          ctx.fillRect(0, y, cw, lineHeight);
        }
        ctx.globalAlpha = renderAlpha;
        ctx.fillStyle = inserted;
        this.drawCodeText(text, PAD_X, this.getCodeTextY(y));
        ctx.restore();
        ctx.globalAlpha = 1;
        y += h;
      } else if (line.type === "r") {
        this.drawReplaceLine(line, y, insertOnly, highlight);
        y += lineHeight;
      }
    }

    this.notifyDraw();
  }

  private drawSettledTransitionState(
    before: string,
    after: string,
    config: TransitionConfig
  ) {
    if (!config.nextStepPersistence) {
      this.drawStaticText(after);
      return;
    }

    const lineStates = this.buildSettledLineStates(before, after, config);

    if (lineStates.length === 0) {
      this.drawStaticText(after);
      return;
    }

    this.drawLines(lineStates, false, config.highlight);
  }

  drawStaticText(text: string) {
    const lines = text.split("\n");
    const lineHeight = this.getCodeLineHeight();
    const h = measureStaticTextHeight(text, this.typographyConfig);
    this.sizeCanvas(h);
    this.clearCanvas(h);
    this.ctx.font = this.monoFont;
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = this.colors.text;
    for (let i = 0; i < lines.length; i++) {
      this.drawCodeText(lines[i], PAD_X, PAD_Y + i * lineHeight + (lineHeight - FONT_SIZE) / 2);
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
      "Press Animate to preview the selected range...",
      PAD_X,
      this.getCodeTextY(PAD_Y)
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
    progressCb: (p: number) => void,
    options?: {
      persistedTransition?: {
        before: string;
        after: string;
        config: TransitionConfig;
      };
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      const totalDuration = Math.max(0, durationMs);
      const persistedTransition = options?.persistedTransition;

      if (persistedTransition) {
        this.drawSettledTransitionState(
          persistedTransition.before,
          persistedTransition.after,
          persistedTransition.config
        );
      } else {
        this.drawStaticText(text);
      }

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
      const ops = buildAnimationOps(before, after, config.fuzzyDiff);
      const skipDel = config.insertOnly;
      const hasAnimatedLines = ops.some(
        (op) => op.t === "i" || op.t === "r" || (!skipDel && op.t === "d")
      );

      if (!hasAnimatedLines) {
        this.drawStaticText(after);
        this.rafId = null;
        progressCb(1);
        resolve();
        return;
      }

      const lineStates: LineState[] = ops.map((op) =>
        op.t === "r"
          ? {
              text: op.v,
              type: "r",
              progress: 0,
              segments: op.segments,
              metrics: this.getReplaceLineMetrics(op.segments),
            }
          : {
              text: op.v,
              type: op.t,
              progress:
                op.t === "i" ? 0 : skipDel && op.t === "d" ? 0 : 1,
            }
      );
      const highlight = config.highlight;
      const startTime = performance.now();
      this.drawLines(lineStates, skipDel, highlight);

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
          else if (ls.type === "i" || ls.type === "r") ls.progress = eased;
        }

        this.drawLines(lineStates, skipDel, highlight);
        progressCb(progress);

        if (progress < 1) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.drawSettledTransitionState(before, after, config);
          this.rafId = null;
          progressCb(1);
          resolve();
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }
}
