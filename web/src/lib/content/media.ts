import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DATA_DIR } from "@/lib/db";

/**
 * Загруженные фото лежат в DATA_DIR/uploads/<вид>/<имя>.webp (не в public/: на сервере он только для чтения)
 * и отдаются маршрутом /media/<вид>/<имя>.webp. Имя содержит хэш содержимого — можно кэшировать навсегда.
 */
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export const MEDIA_KINDS = ["costumes", "programs", "extras", "gallery"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

type Box = { w: number; h: number; fit: "cover" | "inside" };
const SIZES: Record<MediaKind, { main: Box; lg: Box }> = {
  // Карточки героев и обложки программ: 3:4, как фото из комплекта сайта.
  costumes: { main: { w: 480, h: 640, fit: "cover" }, lg: { w: 960, h: 1280, fit: "cover" } },
  programs: { main: { w: 480, h: 640, fit: "cover" }, lg: { w: 960, h: 1280, fit: "cover" } },
  // Шоу и допы: картинка 16:10 сверху карточки.
  extras: { main: { w: 800, h: 500, fit: "cover" }, lg: { w: 1600, h: 1000, fit: "cover" } },
  // Галерея: без обрезки, пропорции как у снимка.
  gallery: { main: { w: 1200, h: 1200, fit: "inside" }, lg: { w: 2000, h: 2000, fit: "inside" } },
};

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function render(input: Buffer, box: Box) {
  return sharp(input, { failOn: "error" })
    .rotate() // учесть поворот из EXIF (фото с телефона)
    .resize(box.w, box.h, { fit: box.fit, position: box.fit === "cover" ? sharp.strategy.attention : undefined, withoutEnlargement: box.fit === "inside" })
    .webp({ quality: 82 })
    .toBuffer();
}

/** Обрабатывает фото и сохраняет две версии: основную и -lg. Возвращает адрес основной (/media/...). */
export async function saveUpload(input: Buffer, kind: MediaKind, prefix: string) {
  const meta = await sharp(input).metadata();
  if (!meta.format || !["jpeg", "png", "webp", "heif", "avif", "gif", "tiff"].includes(meta.format)) {
    throw new Error("Это не похоже на фото. Подойдут JPG, PNG или WebP.");
  }
  const { main, lg } = SIZES[kind];
  const [small, large] = await Promise.all([render(input, main), render(input, lg)]);
  const hash = createHash("sha1").update(small).digest("hex").slice(0, 10);
  const safe = prefix.toLowerCase().replace(/[^a-z0-9_-]+/g, "").slice(0, 40) || "photo";
  const name = `${safe}-${hash}`;
  const dir = path.join(UPLOAD_DIR, kind);
  await fs.mkdir(dir, { recursive: true });
  await Promise.all([fs.writeFile(path.join(dir, `${name}.webp`), small), fs.writeFile(path.join(dir, `${name}-lg.webp`), large)]);
  return `/media/${kind}/${name}.webp`;
}

const TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

/** Безопасно находит файл: только известные папки, только имена из [a-z0-9_-] и картинки. */
export function resolveMedia(parts: string[]): { file: string; type: string } | null {
  if (parts.length !== 2) return null;
  const [kind, name] = parts;
  if (!(MEDIA_KINDS as readonly string[]).includes(kind)) return null;
  if (!/^[a-z0-9_-]+\.(webp|jpe?g|png)$/i.test(name)) return null;
  const file = path.resolve(UPLOAD_DIR, kind, name);
  if (!file.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return null;
  return { file, type: TYPES[path.extname(name).toLowerCase()] };
}
