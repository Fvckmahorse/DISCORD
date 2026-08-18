import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { listUserGuilds, canManage } from "@/lib/discord";
import { bot } from "@/lib/botRest";
import { kvReady } from "@/lib/kv";
import { getWelcome, setWelcome, clearWelcome, buildWelcomeEmbed, type WelcomeConfig } from "@/lib/welcome";

export const runtime = "nodejs";

async function ownerOK() { const s = await auth(); return s?.user && isOwner(s) ? s : null; }
async function canManageGuild(s: any, guildId: string) {
  const token = (s as any).discordAccessToken as string | undefined;
  if (!token) return false;
  try { const g = (await listUserGuilds(token)).find((x) => x.id === guildId); return !!(g && canManage(g)); } catch { return false; }
}

// GET ?guild=ID -> config atual + canais de texto do servidor
export async function GET(req: Request) {
  const s = await ownerOK(); if (!s) return Response.json({ error: "restrito" }, { status: 403 });
  if (!kvReady()) return Response.json({ ready: false });
  const guildId = new URL(req.url).searchParams.get("guild") || "";
  if (!guildId) return Response.json({ error: "guild ausente" }, { status: 400 });
  if (!(await canManageGuild(s, guildId))) return Response.json({ error: "sem permissão nesse servidor" }, { status: 403 });

  let channels: any[] = [];
  try {
    channels = (await bot(`/guilds/${guildId}/channels`))
      .filter((c: any) => c.type === 0 || c.type === 5) // texto/anúncio
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      .map((c: any) => ({ id: c.id, name: c.name }));
  } catch {}
  const cfg = await getWelcome(guildId);
  return Response.json({ ready: true, config: cfg, channels });
}

// POST -> salvar config (ou desativar) / testar
export async function POST(req: Request) {
  const s = await ownerOK(); if (!s) return Response.json({ ok: false, message: "Apenas o dono." }, { status: 403 });
  if (!kvReady()) return Response.json({ ok: false, message: "Conecte o banco (Upstash) primeiro." });
  const b = await req.json().catch(() => ({}));
  const guildId = String(b.guildId || "");
  if (!guildId) return Response.json({ ok: false, message: "Servidor ausente." });
  if (!(await canManageGuild(s, guildId))) return Response.json({ ok: false, message: "Você não gerencia esse servidor." }, { status: 403 });

  const cfg: WelcomeConfig = {
    channelId: String(b.channelId || ""),
    title: String(b.title || "").slice(0, 200),
    message: String(b.message || "").slice(0, 1500),
    color: String(b.color || "7C6CFF").replace("#", "").slice(0, 6),
    enabled: !!b.channelId,
  };

  if (b.action === "test") {
    if (!cfg.channelId) return Response.json({ ok: false, message: "Escolha um canal antes de testar." });
    try {
      const payload = buildWelcomeEmbed(cfg, { memberId: (s as any).discordUser?.id, memberName: s.user?.name || "você", guildName: b.guildName });
      await bot(`/channels/${cfg.channelId}/messages`, "POST", payload);
      return Response.json({ ok: true, message: "✓ Mensagem de teste enviada no canal escolhido!" });
    } catch (e: any) { return Response.json({ ok: false, message: "Falha ao enviar: " + (e?.message || "") + " (o bot tem acesso ao canal?)" }); }
  }

  if (!cfg.channelId) { await clearWelcome(guildId); return Response.json({ ok: true, message: "Boas-vindas DESATIVADAS (nenhum canal escolhido)." }); }
  await setWelcome(guildId, cfg);
  return Response.json({ ok: true, message: "✓ Configuração salva! O bot enviará no canal escolhido." });
}
