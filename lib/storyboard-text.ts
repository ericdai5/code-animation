import type { HighlightMode, TransitionConfig } from "./animator";

export const STORYBOARD_BLOCK_MARKER = "<<<CODE_ANIMATION_BLOCK>>>";

export const DEFAULT_STORYBOARD_TEXT = `${STORYBOARD_BLOCK_MARKER}
type: step
durationMs: 700

const kineticConfig: Config = {
  formulas: [
    id: "kinetic-energy", latex: "K = \\\\frac{1}{2}mv^2",
  ]
}

${STORYBOARD_BLOCK_MARKER}
type: transition
durationMs: 900
insertOnly: false
fuzzyDiff: false

${STORYBOARD_BLOCK_MARKER}
type: step
durationMs: 900

const kineticConfig: Config = {
  formulas: [
    id: "kinetic-energy", latex: "K = \\\\frac{1}{2}mv^2",
  ],
  variables: {
    K: { name: "Kinetic Energy" },
  },
}

${STORYBOARD_BLOCK_MARKER}
type: transition
durationMs: 1200
insertOnly: true
fuzzyDiff: true

${STORYBOARD_BLOCK_MARKER}
type: step

const kineticConfig: Config = {
  formulas: [
    id: "kinetic-energy", latex: "K = \\\\frac{1}{2}mv^2",
  ],
  variables: {
    K: { name: "Kinetic Energy", unit: "J" },
    m: { name: "Mass", unit: "kg" },
    v: { name: "Velocity", unit: "m/s" },
  },
}`;

export interface ParsedStoryboardStep {
  code: string;
  durationMs?: number;
}

export interface ParsedStoryboardGap {
  transition?: Partial<TransitionConfig>;
}

export interface ParsedStoryboardText {
  steps: ParsedStoryboardStep[];
  gaps: ParsedStoryboardGap[];
}

function parseBoolean(value: string | undefined) {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

function parseNumber(value: string | undefined) {
  if (!value) return undefined;

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseHeaders(lines: string[]) {
  const headers: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex < 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key) headers[key] = value;
  }

  return headers;
}

export function parseStoryboardText(text: string): ParsedStoryboardText {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(STORYBOARD_BLOCK_MARKER)
    .map((block) => block.replace(/^\n+|\n+$/g, ""))
    .filter(Boolean);

  const steps: ParsedStoryboardStep[] = [];
  const gaps: ParsedStoryboardGap[] = [];
  let pendingGap: ParsedStoryboardGap = {};

  for (const block of blocks) {
    const lines = block.split("\n");
    const blankLineIndex = lines.findIndex((line) => line.trim() === "");
    const headerLines =
      blankLineIndex >= 0 ? lines.slice(0, blankLineIndex) : lines;
    const body =
      blankLineIndex >= 0
        ? lines
            .slice(blankLineIndex + 1)
            .join("\n")
            .replace(/\n+$/g, "")
        : "";
    const headers = parseHeaders(headerLines);
    const type = headers.type?.trim().toLowerCase();

    if (type === "step") {
      if (steps.length > 0) gaps.push(pendingGap);
      const durationMs = parseNumber(headers.durationMs);

      steps.push({
        code: body,
        durationMs:
          durationMs === undefined ? undefined : Math.max(0, durationMs),
      });
      pendingGap = {};
      continue;
    }

    if (type === "transition") {
      const highlight = headers.highlight?.trim().toLowerCase();
      pendingGap.transition = {
        durationMs: parseNumber(headers.durationMs),
        insertOnly: parseBoolean(headers.insertOnly),
        fuzzyDiff: parseBoolean(headers.fuzzyDiff),
        highlight:
          highlight === "none" || highlight === "line" || highlight === "inline"
            ? (highlight as HighlightMode)
            : undefined,
      };
      continue;
    }
  }

  return {
    steps,
    gaps,
  };
}
