import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { getPresence, setPresence, type Presence } from "@/lib/presence";
import { kvReady } from "@/lib/kv";

export const runtime = "nodejs";

// GET público (o listener do Railway lê daqui — não expõe nada sensível)
export async function GET() {
  return Response.json(await getPresence());
}

// POST só o dono (salva o status escolhido no site)
export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || !isOwner(s)) return Response.json({ ok: false, message: "Apenas o dono." }, { status: 403 });
  if (!kvReady()) return Response.json({ ok: false, message: "Conecte o banco (Upstash) primeiro." });
  const b = await req.json().catch(() => ({}));
  const p: Presence = {
    status: ["online", "idle", "dnd", "invisible"].includes(b.status) ? b.status : "online",
    activityType: ["playing", "listening", "watching", "competing"].includes(b.activityType) ? b.activityType : "watching",
    activityText: String(b.activityText || "").slice(0, 120),
  };
  await setPresence(p);
  return Response.json({ ok: true, message: "✓ Status salvo! O bot atualiza em até ~1 min." });
}
