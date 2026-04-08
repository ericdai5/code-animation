"use client";

import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Check, ChevronDown, RotateCcw } from "lucide-react";

import { ActionButton } from "@/components/ui/button";
import { ExportIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import {
  EXPORT_PRESET_OPTIONS,
  type ExportPresetId,
} from "@/lib/storyboard-editor";

const MENU_MIN_WIDTH_PX = 260;

/** Shared sizing (ActionButton defaults are overridden). */
const toolbarBtnBase =
  "inline-flex h-9 min-h-9 items-center justify-center gap-1.5 border py-0 text-[0.8125rem] font-bold leading-none shadow-none transition duration-200 disabled:cursor-not-allowed disabled:opacity-[0.45]";
/** For buttons that use inline SVG icons from @/components/ui/icons (not Lucide). */
const toolbarBtnInlineSvg = "[&_svg]:block [&_svg]:h-[13px] [&_svg]:w-[13px] [&_svg]:shrink-0";

interface PreviewPanelProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  exportPresetId: ExportPresetId;
  exporting: boolean;
  /** Stretch the canvas area to fill the parent when the styles panel is collapsed. */
  fillAvailableHeight?: boolean;
  onAnimateAll: () => void;
  onExportVideo: (presetId: ExportPresetId) => void | Promise<void>;
  onReset: () => void;
  progress: number;
  running: boolean;
  stepLabel: string;
}

export function PreviewPanel({
  canvasRef,
  exportPresetId,
  exporting,
  fillAvailableHeight = false,
  onAnimateAll,
  onExportVideo,
  onReset,
  progress,
  running,
  stepLabel,
}: PreviewPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuBox, setMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const exportContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuBox(null);
      return;
    }

    const update = () => {
      const el = exportContainerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.max(r.width, MENU_MIN_WIDTH_PX);
      let left = r.right - width;
      left = Math.max(
        8,
        Math.min(left, window.innerWidth - width - 8),
      );
      setMenuBox({
        top: r.bottom + 6,
        left,
        width,
      });
    };

    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (exportContainerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [menuOpen]);

  const dropdown =
    mounted &&
    menuOpen &&
    !exporting &&
    menuBox &&
    createPortal(
      <div
        ref={menuRef}
        className="fixed z-[10050] overflow-hidden rounded-[14px] border border-slate-500/20 bg-white/98 py-1.5 shadow-[0_12px_32px_rgba(27,52,70,0.14)] backdrop-blur-md"
        role="menu"
        aria-label="Export quality"
        style={{
          top: menuBox.top,
          left: menuBox.left,
          width: menuBox.width,
        }}
      >
        {EXPORT_PRESET_OPTIONS.map((preset) => {
          const selected = preset.id === exportPresetId;

          return (
            <button
              key={preset.id}
              type="button"
              role="menuitem"
              className={cn(
                "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50/95",
                selected && "bg-teal-700/8",
              )}
              onClick={() => {
                setMenuOpen(false);
                void onExportVideo(preset.id);
              }}
            >
              <span
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center"
                aria-hidden
              >
                {selected ? (
                  <Check className="size-4 text-teal-700" strokeWidth={2.5} />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.88rem] font-bold text-slate-900">
                  {preset.label}
                </span>
                <span className="mt-0.5 block font-mono text-[0.72rem] text-slate-500">
                  {preset.meta}
                </span>
              </span>
            </button>
          );
        })}
      </div>,
      document.body,
    );

  return (
    <Panel
      className={cn(
        "overflow-visible max-[820px]:border-t-0 border-b-0",
        fillAvailableHeight &&
          "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
      )}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-slate-500/20 bg-gradient-to-b from-slate-50/95 to-slate-100/95 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 basis-0 items-stretch gap-0 rounded-[11px]">
            <ActionButton
              type="button"
              className={cn(
                toolbarBtnBase,
                toolbarBtnInlineSvg,
                "min-w-0 flex-1 rounded-l-[11px] rounded-r-none border-transparent border-r border-white/30 bg-gradient-to-br from-teal-700 to-teal-800 px-3 text-white hover:brightness-[1.03]",
              )}
              onClick={onAnimateAll}
            >
              {running ? <PauseIcon /> : <PlayIcon />}
              {running ? "Pause" : "Animate All"}
            </ActionButton>
            <ActionButton
              type="button"
              className={cn(
                toolbarBtnBase,
                "w-9 min-w-9 shrink-0 rounded-l-none rounded-r-[11px] border-transparent bg-gradient-to-br from-teal-700 to-teal-800 px-0 text-white hover:brightness-[1.03]",
              )}
              onClick={onReset}
              aria-label="Reset"
              title="Reset"
            >
              <RotateCcw
                className="pointer-events-none size-[15px] shrink-0 text-white"
                strokeWidth={2.25}
                aria-hidden
              />
            </ActionButton>
          </div>
          <div
            ref={exportContainerRef}
            className="relative min-w-0 flex-1 basis-0"
          >
            <ActionButton
              type="button"
              className={cn(
                toolbarBtnBase,
                toolbarBtnInlineSvg,
                "w-full rounded-[11px] border-green-700/35 bg-white/80 px-3 text-green-700 hover:border-green-700 hover:bg-white",
              )}
              disabled={exporting}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => {
                if (!exporting) setMenuOpen((open) => !open);
              }}
            >
              {exporting ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-600 animate-pulse" />
                  Recording...
                </>
              ) : (
                <>
                  <ExportIcon />
                  Export
                  <ChevronDown
                    className={cn(
                      "size-[13px] shrink-0 transition-transform duration-200",
                      menuOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </>
              )}
            </ActionButton>
          </div>
        </div>

        <div
          className="h-1 w-full overflow-hidden rounded-full bg-[rgba(96,113,125,0.18)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuetext={stepLabel || undefined}
          aria-label="Animation progress"
        >
          <div
            className="h-full bg-[linear-gradient(90deg,#0f766e,#f59e0b)] transition-[width] duration-75 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      {dropdown}

      <div
        className={cn(
          fillAvailableHeight
            ? "flex min-h-0 flex-1 flex-col"
            : "min-h-[280px]",
        )}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "block w-full",
            fillAvailableHeight && "h-full min-h-0",
          )}
        />
      </div>
    </Panel>
  );
}
