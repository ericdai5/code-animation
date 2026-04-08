import { ActionButton } from "@/components/ui/button";
import { ExportIcon, PauseIcon, PlayIcon, ResetIcon } from "@/components/ui/icons";
import { InfoHint } from "@/components/ui/info-hint";
import {
  Panel,
  SliderValuePill,
} from "@/components/ui/panel";
import {
  FieldCard,
  FieldCopy,
  FieldDescription,
  FieldHeading,
  FieldRow,
  FieldTitle,
} from "@/components/ui/settings";
import { cn } from "@/lib/cn";
import {
  EXPORT_PRESET_OPTIONS,
  type ExportPreset,
  type ExportPresetId,
} from "@/lib/storyboard-editor";

interface PlaybackPanelProps {
  exportPreset: ExportPreset;
  exportPresetId: ExportPresetId;
  exporting: boolean;
  running: boolean;
  onAnimateAll: () => void;
  onExportVideo: () => void;
  onPresetChange: (presetId: ExportPresetId) => void;
  onReset: () => void;
}

export function PlaybackPanel({
  exportPreset,
  exportPresetId,
  exporting,
  running,
  onAnimateAll,
  onExportVideo,
  onPresetChange,
  onReset,
}: PlaybackPanelProps) {
  return (
    <Panel>
      <div className="px-5 pt-5">
        <FieldCard compact className="gap-[14px]">
          <FieldRow>
            <FieldCopy>
              <FieldHeading>
                <FieldTitle>Export quality</FieldTitle>
                <InfoHint text="Choose the render width for the downloaded video. Export keeps the same framing as the preview so longer code snapshots do not get clipped." />
              </FieldHeading>
              <FieldDescription>
                {exportPreset.meta}, same framing as preview
              </FieldDescription>
            </FieldCopy>
            <SliderValuePill>{exportPreset.label}</SliderValuePill>
          </FieldRow>

          <div
            className="grid grid-cols-1 gap-2 min-[821px]:grid-cols-3"
            role="group"
          >
            {EXPORT_PRESET_OPTIONS.map((preset) => {
              const active = preset.id === exportPresetId;

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border border-slate-500/20 bg-white/[0.78] px-3 py-2.5 text-left text-slate-500 transition duration-200 hover:-translate-y-px hover:border-teal-700/25 hover:bg-white/[0.96] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-[0.56]",
                    active &&
                      "border-teal-700/60 bg-teal-700/10 text-slate-900 shadow-[inset_0_0_0_1px_rgba(15,118,110,0.18)]",
                  )}
                  onClick={() => onPresetChange(preset.id)}
                  disabled={exporting}
                  aria-pressed={active}
                >
                  <span className="text-[0.86rem] font-bold">
                    {preset.label}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[0.72rem] text-slate-500",
                      active && "text-teal-700",
                    )}
                  >
                    {preset.meta}
                  </span>
                </button>
              );
            })}
          </div>
        </FieldCard>
      </div>

      <div className="flex flex-col gap-3 px-5 py-5 min-[821px]:flex-row min-[821px]:flex-wrap">
        <ActionButton
          type="button"
          className="w-full flex-1 border-transparent bg-gradient-to-br from-teal-700 to-teal-800 text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)] hover:shadow-[0_14px_28px_rgba(15,118,110,0.28)] min-[821px]:flex-[1_1_150px]"
          onClick={onAnimateAll}
        >
          {running ? <PauseIcon /> : <PlayIcon />}
          {running ? "Pause" : "Animate All"}
        </ActionButton>
        <ActionButton
          type="button"
          className="w-full flex-1 border-slate-500/20 bg-transparent text-slate-500 hover:bg-slate-50/90 hover:text-slate-900 min-[821px]:flex-[1_1_150px]"
          onClick={onReset}
        >
          <ResetIcon />
          Reset
        </ActionButton>
        <ActionButton
          type="button"
          className="w-full flex-1 border-green-700/35 bg-transparent text-green-700 hover:border-green-700 hover:bg-green-700/10 disabled:opacity-[0.45] min-[821px]:flex-[1_1_150px]"
          onClick={onExportVideo}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              Recording...
            </>
          ) : (
            <>
              <ExportIcon />
              Export Video
            </>
          )}
        </ActionButton>
      </div>
    </Panel>
  );
}
