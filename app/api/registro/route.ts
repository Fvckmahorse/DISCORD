import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { listUserGuilds, canManage } from "@/lib/discord";
import { bot } from "@/lib/botRest";
import { kvReady } from "@/lib/kv";
import { getRegistro, setRegistro, emptyRegistro, buildPanel, ensureRoles, type RegConfig } from "@/lib/registro";

export const runtime = "nodejs";

async function ownerOK() { const s = await auth(); return s?.user && isOwner(s) ? s : null; }
async function canManageGuild(s: any, guildId: string) {
  const token = (s as any).discordAccessToken as string | undefined;
  if (!token) return false;
  try { const g = (await listUserGuilds(token)).find((x) => x.id === guildId); return !!(g && canManage(g)); } catch { return false; }
}

// GET ?guild=ID -> config + canais de texto + cargos existentes
export async function GET(req: Request) {
  const s = await ownerOK(); if (!s) return Response.json({ error: "restrito" }, { status: 403 });
  if (!kvReady()) return Response.json({ ready: false });
  const guildId = new URL(req.url).searchParams.get("guild") || "";
  if (!guildId) return Response.json({ error: "guild ausente" }, { status: 400 });
  if (!(await canManageGuild(s, guildId))) return Response.json({ error: "sem permissão" }, { status: 403 });

  let channels: any[] = [], roles: any[] = [];
  try {
    channels = (await bot(`/guilds/${guildId}/channels`)).filter((c: any) => c.type === 0 || c.type === 5)
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)).map((c: any) => ({ id: c.id, name: c.name }));
  } catch {}
  try {
    roles = (await bot(`/guilds/${guildId}/roles`)).filter((r: any) => r.name !== "@everyone" && !r.managed)
      .sort((a: any, b: any) => b.position - a.position).map((r: any) => ({ id: r.id, name: r.name }));
  } catch {}
  const cfg = (await getRegistro(guildId)) || emptyRegistro();
  return Response.json({ ready: true, config: cfg, channels, roles });
}

// POST -> salvar config, ou publicar/atualizar o painel no Discord
export async function POST(req: Request) {
  const s = await ownerOK(); if (!s) return Response.json({ ok: false, message: "Apenas o dono." }, { status: 403 });
  if (!kvReady()) return Response.json({ ok: false, message: "Conecte o banco (Upstash) primeiro." });
  const b = await req.json().catch(() => ({}));
  const guildId = String(b.guildId || "");
  if (!guildId) return Response.json({ ok: false, message: "Servidor ausente." });
  if (!(await canManageGuild(s, guildId))) return Response.json({ ok: false, message: "Você não gerencia esse servidor." }, { status: 403 });

  let cfg = b.config as RegConfig;
  if (!cfg) return Response.json({ ok: false, message: "Config ausente." });

  if (b.action === "publish") {
    if (!cfg.channelId) return Response.json({ ok: false, message: "Escolha um canal para enviar o painel." });
    try {
      cfg = await ensureRoles(guildId, cfg); // cria cargos que faltam
      const payload = buildPanel(cfg);
      if (cfg.messageId) {
        // tenta editar o painel existente (sem duplicar)
        try { await bot(`/channels/${cfg.channelId}/messages/${cfg.messageId}`, "PATCH", payload); }
        catch { const m = await bot(`/channels/${cfg.channelId}/messages`, "POST", payload); cfg.messageId = m.id; }
      } else {
        const m = await bot(`/channels/${cfg.channelId}/messages`, "POST", payload); cfg.messageId = m.id;
      }
      await setRegistro(guildId, cfg);
      return Response.json({ ok: true, message: "✓ Painel de registro enviado/atualizado no canal!", config: cfg });
    } catch (e: any) { return Response.json({ ok: false, message: "Falha ao publicar: " + (e?.message || "") + " (o bot tem acesso ao canal e permissão de Gerenciar Cargos?)" }); }
  }

  // apenas salvar
  await setRegistro(guildId, cfg);
  return Response.json({ ok: true, message: "✓ Configuração salva.", config: cfg });
}
