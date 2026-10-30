"use client";

export type MediaKind = "costumes" | "programs" | "extras" | "gallery";

/** Уменьшаем снимок в браузере (фото с телефона бывают по 10 МБ) и сразу учитываем поворот. */
async function downscale(file: File, max = 2000): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k);
    const h = Math.round(bmp.height * k);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    // Браузер не умеет открыть формат — отправляем как есть, сервер попробует сам.
    return file;
  }
}

/** Загружает фото и возвращает его адрес на сайте (/media/...). */
export async function uploadPhoto(file: File, kind: MediaKind, prefix: string): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) throw new Error("Выберите фото");
  const blob = await downscale(file);
  const fd = new FormData();
  fd.append("file", blob, "photo.jpg");
  fd.append("kind", kind);
  fd.append("prefix", prefix);
  let res: Response;
  try {
    res = await fetch("/admin/upload", { method: "POST", body: fd });
  } catch {
    throw new Error("Нет связи. Проверьте интернет и попробуйте ещё раз.");
  }
  const j = (await res.json().catch(() => null)) as { ok: boolean; url?: string; error?: string } | null;
  if (!j?.ok || !j.url) throw new Error(j?.error ?? "Не получилось загрузить фото");
  return j.url;
}
