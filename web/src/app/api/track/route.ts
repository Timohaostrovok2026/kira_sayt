import { getDb } from "@/lib/db";

interface Incoming {
  visitor?: string;
  session?: string;
  ref?: string | null;
  utm?: string | null;
  w?: number;
  events?: { name?: string; path?: string; props?: unknown; ts?: number }[];
}

const BOT = /bot|crawl|spider|preview|headless|lighthouse/i;

function refHost(ref?: string | null, self?: string | null) {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    return h === self ? null : h;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  let body: Incoming;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const events = (body.events ?? []).slice(0, 50);
  if (!events.length || !body.visitor || !body.session) return new Response(null, { status: 204 });

  const self = (req.headers.get("host") ?? "").split(":")[0].replace(/^www\./, "");
  const device = (body.w ?? 0) < 768 ? "mobile" : (body.w ?? 0) < 1100 ? "tablet" : "desktop";
  const ref = refHost(body.ref, self);
  const now = Date.now();
  const stmt = getDb().prepare(
    "INSERT INTO events (ts, visitor, session, name, path, props, ref, utm, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const e of events) {
    if (!e.name) continue;
    // Время клиента принимаем, только если оно правдоподобно.
    const ts = e.ts && Math.abs(now - e.ts) < 10 * 60_000 ? e.ts : now;
    stmt.run(
      ts,
      String(body.visitor).slice(0, 64),
      String(body.session).slice(0, 64),
      String(e.name).slice(0, 64),
      String(e.path ?? "/").slice(0, 200),
      e.props ? JSON.stringify(e.props).slice(0, 2000) : null,
      ref,
      body.utm ? String(body.utm).slice(0, 100) : null,
      device,
    );
  }
  return new Response(null, { status: 204 });
}
