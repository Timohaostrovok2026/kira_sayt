import fs from "node:fs/promises";
import { resolveMedia } from "@/lib/content/media";

/** Отдаёт загруженные в админке фото из DATA_DIR/uploads. Имена с хэшем — кэш навсегда. */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const hit = resolveMedia(path);
  if (!hit) return new Response("Not found", { status: 404 });
  try {
    const body = await fs.readFile(hit.file);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": hit.type,
        "Content-Length": String(body.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
