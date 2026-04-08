import { InfoIcon } from "@/components/ui/icons";

export function InfoHint({ text }: { text: string }) {
  return (
    <span
      className="group relative inline-flex shrink-0 cursor-help items-center justify-center text-slate-500 outline-none"
      tabIndex={0}
      aria-label={text}
    >
      <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[rgba(19,35,43,0.05)]">
        <InfoIcon />
      </span>
      <span
        className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-10 w-[220px] max-w-[min(220px,calc(100vw-48px))] -translate-y-1 rounded-[14px] bg-[rgba(19,35,43,0.94)] px-3 py-2.5 text-[0.75rem] leading-[1.45] text-white opacity-0 shadow-[0_12px_28px_rgba(19,35,43,0.18)] transition duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
}
