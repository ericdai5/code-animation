import { readFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_STORYBOARD_TEXT } from "@/lib/storyboard-text";

export async function GET() {
  const storyboardPath = path.join(process.cwd(), "DEFAULT_STEP_CODES.txt");

  try {
    const text = await readFile(storyboardPath, "utf8");
    return new Response(text, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response(DEFAULT_STORYBOARD_TEXT, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
