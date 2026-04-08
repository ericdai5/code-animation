import { type ColorConfig } from "@/lib/animator";
import { Panel, PanelEyebrow, PanelHeader, PanelTitle } from "@/components/ui/panel";

interface ColorPanelProps {
  colors: ColorConfig;
  onUpdateColor: (key: keyof ColorConfig, value: string) => void;
}

const COLOR_OPTIONS: [keyof ColorConfig, string][] = [
  ["bg", "Background"],
  ["text", "Code"],
  ["inserted", "Inserted"],
  ["deleted", "Deleted"],
];

export function ColorPanel({ colors, onUpdateColor }: ColorPanelProps) {
  return (
    <Panel>
      <PanelHeader compact>
        <div>
          <PanelEyebrow>Theme</PanelEyebrow>
          <PanelTitle>Preview Colors</PanelTitle>
        </div>
      </PanelHeader>

      <div className="flex flex-wrap gap-3 px-5 py-5">
        {COLOR_OPTIONS.map(([key, label]) => (
          <label
            key={key}
            className="inline-flex cursor-pointer items-center gap-2.5 rounded-[14px] border border-slate-500/20 bg-slate-50/90 px-3 py-2.5"
          >
            <input
              className="h-[30px] w-[30px] cursor-pointer appearance-none rounded-[10px] border-2 border-slate-900/10 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-[2px] [&::-webkit-color-swatch]:rounded-[6px] [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-[6px] [&::-moz-color-swatch]:border-none"
              type="color"
              value={colors[key]}
              onChange={(event) => onUpdateColor(key, event.target.value)}
            />
            <span className="text-[0.86rem] font-semibold text-slate-500">
              {label}
            </span>
          </label>
        ))}
      </div>
    </Panel>
  );
}
