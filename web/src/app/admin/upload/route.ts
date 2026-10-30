import { isAuthed } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, MEDIA_KINDS, saveUpload, type MediaKind } from "@/lib/content/media";

/**
 * Загрузка фото из админки. Не server action: у них лимит тела 1 МБ, а фото с телефона больше.
 * Браузер заранее уменьшает снимок, здесь sharp режет под нужный формат и сохраняет в DATA_DIR/uploads.
 */
export async function POST(req: Request) {
  if (!(await isAuthed())) return Response.json({ ok: false, error: "Нужно войти заново" }, { status: 401 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ ok: false, error: "Не удалось прочитать файл" }, { status: 400 });
  }
  const kind = String(form.get("kind") ?? "") as MediaKind;
  const prefix = String(form.get("prefix") ?? "photo");
  const file = form.get("file");
  if (!MEDIA_KINDS.includes(kind)) return Response.json({ ok: false, error: "Неизвестный раздел" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return Response.json({ ok: false, error: "Выберите фото" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ ok: false, error: "Фото больше 15 МБ" }, { status: 413 });
  try {
    const url = await saveUpload(Buffer.from(await file.arrayBuffer()), kind, prefix);
    return Response.json({ ok: true, url });
  } catch (e) {
    const msg = e instanceof Error && /фото/i.test(e.message) ? e.message : "Не получилось обработать фото. Попробуйте JPG или PNG.";
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}
