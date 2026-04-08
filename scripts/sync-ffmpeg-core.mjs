import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "node_modules", "@ffmpeg", "core", "dist", "umd");
const targetDir = path.join(rootDir, "public", "vendor", "ffmpeg");

await mkdir(targetDir, { recursive: true });

await Promise.all([
  copyFile(
    path.join(sourceDir, "ffmpeg-core.js"),
    path.join(targetDir, "ffmpeg-core.js"),
  ),
  copyFile(
    path.join(sourceDir, "ffmpeg-core.wasm"),
    path.join(targetDir, "ffmpeg-core.wasm"),
  ),
]);
