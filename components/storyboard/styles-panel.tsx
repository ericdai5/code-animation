"use client";

import { useState } from "react";

import { ChevronDown, Palette } from "lucide-react";

import { InfoHint } from "@/components/ui/info-hint";
import { MetaPill, Panel, SliderValuePill } from "@/components/ui/panel";
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
  CODE_FONT_WEIGHT_OPTIONS,
  CODE_LETTER_SPACING_MAX,
  CODE_LETTER_SPACING_MIN,
  CODE_LETTER_SPACING_STEP,
  CODE_LINE_SPACING_MAX,
  CODE_LINE_SPACING_MIN,
  CODE_LINE_SPACING_STEP,
  type CodeFontWeight,
  type ColorConfig,
  type TypographyConfig,
} from "@/lib/animator";

interface StylesPanelProps {
  colors: ColorConfig;
  typography: TypographyConfig;
  /** Controlled expand state (drives layout in the parent column). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onUpdateColor: (key: keyof ColorConfig, value: string) => void;
  onUpdateTypography: (patch: Partial<TypographyConfig>) => void;
}

const FONT_WEIGHT_OPTIONS: {
  value: CodeFontWeight;
  label: string;
  meta: string;
}[] = CODE_FONT_WEIGHT_OPTIONS.map((value) => ({
  value,
  label: value === 400 ? "Regular" : value === 500 ? "Medium" : "Bold",
  meta: `${value}`,
}));

const COLOR_OPTIONS: [keyof ColorConfig, string][] = [
  ["bg", "Background"],
  ["text", "Code"],
  ["inserted", "Inserted"],
  ["deleted", "Deleted"],
];

function formatStyleValue(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function StylesPanel({
  colors,
  typography,
  expanded: expandedProp,
  onExpandedChange,
  onUpdateColor,
  onUpdateTypography,
}: StylesPanelProps) {
  const [expandedUncontrolled, setExpandedUncontrolled] = useState(true);
  const isControlled = expandedProp !== undefined;
  const expanded = expandedProp ?? expandedUncontrolled;

  const setExpanded = (next: boolean) => {
    onExpandedChange?.(next);
    if (!isControlled) {
      setExpandedUncontrolled(next);
    }
  };

  const selectedWeight =
    FONT_WEIGHT_OPTIONS.find(
      (option) => option.value === typography.codeFontWeight,
    ) ?? FONT_WEIGHT_OPTIONS[0];

  return (
    <Panel
      className={cn(
        "flex flex-col overflow-hidden border-t-0",
        expanded
          ? "h-full min-h-0 flex-1"
          : "shrink-0",
      )}
    >
      <button
        type="button"
        className={cn(
          "shrink-0 flex w-full items-center justify-between gap-3 px-[22px] py-4 text-left transition-colors hover:bg-slate-50/80",
          expanded && "border-b border-slate-500/20",
        )}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex min-w-0 items-center gap-2 text-[0.92rem] font-bold text-slate-800">
          <Palette className="size-[15px] shrink-0 text-teal-700" aria-hidden />
          Styles
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <MetaPill className="font-mono text-[0.72rem] uppercase tracking-[0.08em]">
            {selectedWeight.label}
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

      {expanded ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-3 px-5 py-5">
            <FieldCard compact className="gap-[14px]">
              <FieldRow>
                <FieldCopy>
                  <FieldHeading>
                    <FieldTitle>Font thickness</FieldTitle>
                    <InfoHint text="Adjust how heavy the code font appears in the editor, preview, and exported video." />
                  </FieldHeading>
                  <FieldDescription>
                    Heavier weights make code stand out more in the animation.
                  </FieldDescription>
                </FieldCopy>
                <SliderValuePill>{selectedWeight.meta}</SliderValuePill>
              </FieldRow>

              <div
                className="grid grid-cols-1 gap-2 min-[821px]:grid-cols-3"
                role="group"
              >
                {FONT_WEIGHT_OPTIONS.map((option) => {
                  const active = option.value === typography.codeFontWeight;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-xl border border-slate-500/20 bg-white/[0.78] px-3 py-2.5 text-left text-slate-500 transition duration-200 hover:-translate-y-px hover:border-teal-700/25 hover:bg-white/[0.96]",
                        active &&
                          "border-teal-700/60 bg-teal-700/10 text-slate-900 shadow-[inset_0_0_0_1px_rgba(15,118,110,0.18)]",
                      )}
                      onClick={() =>
                        onUpdateTypography({
                          codeFontWeight: option.value,
                        })
                      }
                      aria-pressed={active}
                    >
                      <span
                        className="font-mono text-[0.92rem] text-slate-900"
                        style={{ fontWeight: option.value }}
                      >
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[0.72rem] text-slate-500",
                          active && "text-teal-700",
                        )}
                      >
                        Weight {option.meta}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FieldCard>

            <FieldCard compact>
              <FieldRow>
                <FieldCopy>
                  <FieldHeading>
                    <FieldTitle>Line spacing</FieldTitle>
                    <InfoHint text="Control the vertical space between code lines in the editor, preview, and export." />
                  </FieldHeading>
                  <FieldDescription>
                    Higher values create more breathing room between lines.
                  </FieldDescription>
                </FieldCopy>
                <SliderValuePill>
                  {formatStyleValue(typography.codeLineSpacing)}x
                </SliderValuePill>
              </FieldRow>

              <RangeInput
                min={CODE_LINE_SPACING_MIN}
                max={CODE_LINE_SPACING_MAX}
                step={CODE_LINE_SPACING_STEP}
                value={typography.codeLineSpacing}
                onChange={(event) =>
                  onUpdateTypography({
                    codeLineSpacing: Number(event.target.value),
                  })
                }
              />
            </FieldCard>

            <FieldCard compact>
              <FieldRow>
                <FieldCopy>
                  <FieldHeading>
                    <FieldTitle>Letter spacing</FieldTitle>
                    <InfoHint text="Fine-tune the spacing between characters for the code font across preview, export, and editing." />
                  </FieldHeading>
                  <FieldDescription>
                    Negative values tighten the text; positive values spread it
                    out.
                  </FieldDescription>
                </FieldCopy>
                <SliderValuePill>
                  {formatStyleValue(typography.codeLetterSpacing)}px
                </SliderValuePill>
              </FieldRow>

              <RangeInput
                min={CODE_LETTER_SPACING_MIN}
                max={CODE_LETTER_SPACING_MAX}
                step={CODE_LETTER_SPACING_STEP}
                value={typography.codeLetterSpacing}
                onChange={(event) =>
                  onUpdateTypography({
                    codeLetterSpacing: Number(event.target.value),
                  })
                }
              />
            </FieldCard>

            <FieldCard compact className="gap-[14px]">
              <FieldRow>
                <FieldCopy>
                  <FieldHeading>
                    <FieldTitle>Colors</FieldTitle>
                    <InfoHint text="Adjust the canvas background, base code color, and diff highlight colors." />
                  </FieldHeading>
                  <FieldDescription>
                    These colors apply to the live preview and exported video.
                  </FieldDescription>
                </FieldCopy>
              </FieldRow>

              <div className="grid grid-cols-1 gap-2 min-[821px]:grid-cols-2">
                {COLOR_OPTIONS.map(([key, label]) => (
                  <label
                    key={key}
                    className="inline-flex cursor-pointer items-center gap-2.5 rounded-[14px] border border-slate-500/20 bg-white/[0.78] px-3 py-2.5"
                  >
                    <input
                      className="h-[30px] w-[30px] cursor-pointer appearance-none rounded-[10px] border-2 border-slate-900/10 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-[2px] [&::-webkit-color-swatch]:rounded-[6px] [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-[6px] [&::-moz-color-swatch]:border-none"
                      type="color"
                      value={colors[key]}
                      onChange={(event) =>
                        onUpdateColor(key, event.target.value)
                      }
                    />
                    <span className="text-[0.86rem] font-semibold text-slate-500">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </FieldCard>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
