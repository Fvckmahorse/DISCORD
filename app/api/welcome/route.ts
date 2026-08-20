import { bot } from "@/lib/botRest";
import { getWelcome, buildWelcomeEmbed } from "@/lib/welcome";

export const runtime = "nodejs";

/* Chamado por um "escutador" 24/7 quando um membro entra.
   Protegido por WELCOME_SECRET. Se o servidor não tiver canal escolhido, NÃO envia. */
export async function POST(req: Request) {
  const secret = process.env.WELCOME_SECRET;
  const got = req.headers.get("x-welcome-secret") || new URL(req.url).searchParams.get("key");
  if (!secret || got !== secret) return Response.json({ ok: false, error: "não autorizado" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const guildId = String(b.guildId || "");
  if (!guildId) return Response.json({ ok: false, error: "guildId ausente" }, { status: 400 });

  const cfg = await getWelcome(guildId);
  if (!cfg || !cfg.enabled || !cfg.channelId) return Response.json({ ok: true, sent: false }); // sem canal = não envia

  try {
    const payload = buildWelcomeEmbed(cfg, { memberId: b.memberId, memberName: b.memberName, guildName: b.guildName });
    await bot(`/channels/${cfg.channelId}/messages`, "POST", payload);
    return Response.json({ ok: true, sent: true });
  } catch (e: any) { return Response.json({ ok: false, error: e?.message }, { status: 500 }); }
}
