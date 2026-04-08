import type { FFmpeg, ProgressEventCallback } from "@ffmpeg/ffmpeg";

const LOCAL_FFMPEG_CORE_BASE_PATH = "/vendor/ffmpeg";
const PREFERRED_RECORDING_MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

export type VideoFileExtension = "mp4" | "webm";

let ffmpegPromise: Promise<FFmpeg> | null = null;

function getJobId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}`;
}

function getFFmpegAssetUrl(path: string) {
  if (typeof window === "undefined") {
    throw new Error("FFmpeg assets can only be loaded in the browser.");
  }

  return new URL(path, window.location.origin).toString();
}

async function getFFmpegClient() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const ffmpeg = new FFmpeg();

      await ffmpeg.load({
        coreURL: getFFmpegAssetUrl(
          `${LOCAL_FFMPEG_CORE_BASE_PATH}/ffmpeg-core.js`,
        ),
        wasmURL: getFFmpegAssetUrl(
          `${LOCAL_FFMPEG_CORE_BASE_PATH}/ffmpeg-core.wasm`,
        ),
      });

      return ffmpeg;
    })().catch((error: unknown) => {
      ffmpegPromise = null;
      throw error;
    });
  }

  return ffmpegPromise;
}

export function getPreferredVideoRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;

  return PREFERRED_RECORDING_MIME_TYPES.find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType),
  );
}

export function getVideoFileExtension(
  mimeType?: string | null,
): VideoFileExtension | null {
  if (!mimeType) return null;
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("webm")) return "webm";
  return null;
}

export function downloadBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

interface EnsureMp4ExportBlobOptions {
  inputMimeType?: string | null;
  onProgress?: (progress: number) => void;
  videoBitsPerSecond: number;
}

export async function ensureMp4ExportBlob(
  source: Blob,
  { inputMimeType, onProgress, videoBitsPerSecond }: EnsureMp4ExportBlobOptions,
) {
  const resolvedMimeType = inputMimeType ?? source.type;

  if (resolvedMimeType.includes("mp4")) {
    return source.type === "video/mp4"
      ? source
      : source.slice(0, source.size, "video/mp4");
  }

  const ffmpeg = await getFFmpegClient();
  const jobId = getJobId();
  const inputPath = `input-${jobId}.${getVideoFileExtension(resolvedMimeType) ?? "webm"}`;
  const outputPath = `output-${jobId}.mp4`;
  const progressHandler: ProgressEventCallback = ({ progress }) => {
    onProgress?.(Math.max(0, Math.min(progress, 1)));
  };

  ffmpeg.on("progress", progressHandler);

  try {
    await ffmpeg.writeFile(inputPath, new Uint8Array(await source.arrayBuffer()));

    const exitCode = await ffmpeg.exec([
      "-i",
      inputPath,
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-b:v",
      `${Math.max(1_000, Math.round(videoBitsPerSecond / 1_000))}k`,
      outputPath,
    ]);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg exited with code ${exitCode} while finalizing MP4.`);
    }

    const output = await ffmpeg.readFile(outputPath);
    if (!(output instanceof Uint8Array)) {
      throw new Error("FFmpeg returned an unexpected MP4 payload.");
    }

    const mp4Bytes = new Uint8Array(output.byteLength);
    mp4Bytes.set(output);

    return new Blob([mp4Bytes.buffer], { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", progressHandler);
    await Promise.allSettled([
      ffmpeg.deleteFile(inputPath),
      ffmpeg.deleteFile(outputPath),
    ]);
  }
}
