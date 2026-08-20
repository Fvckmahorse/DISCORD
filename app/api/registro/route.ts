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
    if (!cfg.categories.length) return Response.json({ ok: false, message: "Adicione ao menos uma categoria antes de publicar." });

    // ===== PRÉ-CHECAGENS (nada é criado ainda) =====
    // 1) o canal existe e é do próprio servidor?
    let channel: any;
    try {
      channel = await bot(`/channels/${cfg.channelId}`);
      if (channel.guild_id && channel.guild_id !== guildId) return Response.json({ ok: false, message: "Esse canal não é deste servidor." });
    } catch { return Response.json({ ok: false, message: "Não achei o canal (ele existe? o bot enxerga ele?)." }); }

    // 2) o bot consegue mandar mensagem nesse canal? (teste real e reversível)
    let testMsgId: string | null = null;
    try {
      const t = await bot(`/channels/${cfg.channelId}/messages`, "POST", { content: "⏳ Preparando o registro…" });
      testMsgId = t.id;
    } catch {
      return Response.json({ ok: false, message: "O bot não consegue enviar mensagem nesse canal. Dê a ele permissão de **Ver canal** + **Enviar mensagens** aí." });
    }

    // 3) precisa criar cargos? então checa Gerenciar Cargos + hierarquia ANTES
    const precisaCriar = cfg.categories.some((c) => c.options.some((o) => !o.roleId));
    if (precisaCriar) {
      try {
        const me = await bot(`/guilds/${guildId}/members/${process.env.AUTH_DISCORD_ID}`);
        const roles = await bot(`/guilds/${guildId}/roles`);
        const pos: Record<string, number> = {}; let manage = false;
        for (const r of roles) { pos[r.id] = r.position; if ((BigInt(r.permissions || "0") & (1n << 28n)) === (1n << 28n) || (BigInt(r.permissions || "0") & (1n << 3n)) === (1n << 3n)) { /* role tem manage/admin */ } }
        // permissão do bot: precisa ter Manage Roles em algum cargo dele (ou admin)
        const myRoles = (me.roles || []) as string[];
        for (const rid of myRoles) {
          const r = roles.find((x: any) => x.id === rid);
          if (r && ((BigInt(r.permissions || "0") & (1n << 28n)) === (1n << 28n) || (BigInt(r.permissions || "0") & (1n << 3n)) === (1n << 3n))) manage = true;
        }
        if (!manage) { if (testMsgId) await bot(`/channels/${cfg.channelId}/messages/${testMsgId}`, "DELETE").catch(() => {}); return Response.json({ ok: false, message: "O bot precisa da permissão **Gerenciar Cargos** pra criar os cargos do registro. Ative e tente de novo (nenhum cargo foi criado)." }); }
      } catch {
        if (testMsgId) await bot(`/channels/${cfg.channelId}/messages/${testMsgId}`, "DELETE").catch(() => {});
        return Response.json({ ok: false, message: "Não consegui verificar as permissões do bot. Confira se ele está no servidor (nenhum cargo foi criado)." });
      }
    }

    // ===== VALIDA O PAINEL ANTES DE CRIAR CARGOS =====
    // Edita a mensagem de teste com o painel real. Se o formato for inválido
    // (ex.: emoji ruim), falha AQUI, sem nenhum cargo criado.
    try {
      const previewPayload = buildPanel(cfg);
      await bot(`/channels/${cfg.channelId}/messages/${testMsgId}`, "PATCH", previewPayload);
    } catch (e: any) {
      if (testMsgId) await bot(`/channels/${cfg.channelId}/messages/${testMsgId}`, "DELETE").catch(() => {});
      const errs = e?.data?.errors ? JSON.stringify(e.data.errors) : "";
      const detail = errs ? errs.slice(0, 400) : (e?.message || "formato inválido");
      return Response.json({ ok: false, message: "O painel não foi aceito pelo Discord (nenhum cargo foi criado).\nDetalhe: " + detail });
    }

    // ===== PAINEL VÁLIDO: agora sim cria cargos e finaliza =====
    try {
      cfg = await ensureRoles(guildId, cfg); // cria só os cargos que faltam
      const payload = buildPanel(cfg);
      if (cfg.messageId && cfg.messageId !== testMsgId) {
        // já existia um painel antigo: atualiza ele e apaga o de teste
        try { await bot(`/channels/${cfg.channelId}/messages/${cfg.messageId}`, "PATCH", payload); }
        catch { cfg.messageId = testMsgId!; await bot(`/channels/${cfg.channelId}/messages/${cfg.messageId}`, "PATCH", payload); testMsgId = null; }
        if (testMsgId) await bot(`/channels/${cfg.channelId}/messages/${testMsgId}`, "DELETE").catch(() => {});
      } else {
        // usa a própria mensagem de teste como painel final (já está no canal)
        await bot(`/channels/${cfg.channelId}/messages/${testMsgId}`, "PATCH", payload);
        cfg.messageId = testMsgId!;
      }
      await setRegistro(guildId, cfg);
      return Response.json({ ok: true, message: "✓ Painel de registro enviado/atualizado no canal!", config: cfg });
    } catch (e: any) {
      return Response.json({ ok: false, message: "Falha ao finalizar: " + (e?.message || "") });
    }
  }

  // apenas salvar
  await setRegistro(guildId, cfg);
  return Response.json({ ok: true, message: "✓ Configuração salva.", config: cfg });
}
