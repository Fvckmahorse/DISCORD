/* Handlers dos slash commands de moderação/membros/info.
   Recebe o corpo da interação e devolve a resposta (type 4). */
import { bot, snowflakeDate } from "./botRest";
import { P, memberHas } from "./perms";

const GREEN = 0x43b581, RED = 0xf0616d, BLUE = 0x5865f2, GRAY = 0x95a5a6;
const EPH = 64;

function embed(e: any, ephemeral = false) { return { type: 4, data: { embeds: [e], flags: ephemeral ? EPH : 0 } }; }
function ok(title: string, desc?: string, ephemeral = false) { return embed({ title, description: desc, color: GREEN }, ephemeral); }
function fail(desc: string) { return embed({ description: "❌ " + desc, color: RED }, true); }
function warn(desc: string) { return embed({ description: "⚠️ " + desc, color: 0xe3a54a }, true); }

function opt(body: any, name: string) { return (body.data?.options || []).find((o: any) => o.name === name)?.value; }
function optUser(body: any, name: string) { const id = opt(body, name); if (!id) return null; const u = body.data?.resolved?.users?.[id]; const m = body.data?.resolved?.members?.[id]; return { id, user: u, member: m }; }

function parseDuration(s: string): number | null {
  if (!s) return null;
  if (/^(off|0|nenhum|nao|não)$/i.test(s.trim())) return 0;
  const m = s.trim().match(/^(\d+)\s*(s|seg|m|min|h|hr|hora|d|dia)?/i);
  if (!m) return null;
  const n = parseInt(m[1], 10); const u = (m[2] || "s").toLowerCase()[0];
  return n * (u === "d" ? 86400 : u === "h" ? 3600 : u === "m" ? 60 : 1);
}
function fmtDur(sec: number): string {
  if (sec % 86400 === 0) return `${sec/86400}d`; if (sec % 3600 === 0) return `${sec/3600}h`;
  if (sec % 60 === 0) return `${sec/60}m`; return `${sec}s`;
}

async function rolePositions(guildId: string) {
  const roles = await bot(`/guilds/${guildId}/roles`);
  const pos: Record<string, number> = {}; roles.forEach((r: any) => (pos[r.id] = r.position));
  return { roles, pos };
}
function highest(roleIds: string[], pos: Record<string, number>) { let m = 0; for (const id of roleIds || []) m = Math.max(m, pos[id] || 0); return m; }

// checa se o executor (e o bot) podem agir sobre o alvo, respeitando hierarquia
async function canAct(body: any, targetRoleIds: string[]): Promise<string | null> {
  const guildId = body.guild_id;
  const { pos } = await rolePositions(guildId);
  const execTop = highest(body.member?.roles || [], pos);
  const targetTop = highest(targetRoleIds || [], pos);
  // owner do servidor sempre pode
  let ownerId = "";
  try { ownerId = (await bot(`/guilds/${guildId}`)).owner_id; } catch {}
  const isOwner = body.member?.user?.id === ownerId;
  if (!isOwner && targetTop >= execTop) return "Você não pode agir sobre alguém com cargo igual ou superior ao seu.";
  // bot precisa estar acima do alvo
  const botId = process.env.AUTH_DISCORD_ID!;
  try {
    const botMember = await bot(`/guilds/${guildId}/members/${botId}`);
    if (highest(botMember.roles || [], pos) <= targetTop) return "Meu cargo está abaixo (ou igual) ao do alvo — suba o cargo do bot.";
  } catch {}
  return null;
}

// edita o overwrite de @everyone somando/removendo bits de allow/deny
async function editEveryone(channelId: string, guildId: string, o: { denyAdd?: bigint; denyDel?: bigint; allowAdd?: bigint; allowDel?: bigint }) {
  const ch = await bot(`/channels/${channelId}`);
  const ov = (ch.permission_overwrites || []).find((x: any) => x.id === guildId) || { allow: "0", deny: "0" };
  const beforeDeny = BigInt(ov.deny || "0");
  let allow = BigInt(ov.allow || "0"), deny = beforeDeny;
  if (o.allowAdd) allow |= o.allowAdd; if (o.allowDel) allow &= ~o.allowDel;
  if (o.denyAdd) deny |= o.denyAdd; if (o.denyDel) deny &= ~o.denyDel;
  await bot(`/channels/${channelId}/permissions/${guildId}`, "PUT", { type: 0, allow: allow.toString(), deny: deny.toString() });
  return { beforeDeny, ch };
}

async function staffAllowSend(channelId: string, guildId: string) {
  // deixa cargos de staff continuarem enviando durante o lock
  try {
    const roles = await bot(`/guilds/${guildId}/roles`);
    for (const r of roles) {
      if (/owner|dono|admin|moder|mod\b|staff/i.test(r.name)) {
        await bot(`/channels/${channelId}/permissions/${r.id}`, "PUT", { type: 0, allow: P.SEND_MESSAGES.toString(), deny: "0" });
      }
    }
  } catch {}
}

const H: Record<string, (body: any) => Promise<any>> = {
  // ───────── CANAIS ─────────
  async lock(body) {
    const gid = body.guild_id, cid = body.channel_id;
    const { beforeDeny } = await editEveryone(cid, gid, { denyAdd: P.SEND_MESSAGES });
    if ((beforeDeny & P.SEND_MESSAGES) === P.SEND_MESSAGES) return warn("Este canal já está bloqueado.");
    await staffAllowSend(cid, gid);
    return embed({ title: "🔒 | Canal bloqueado!", description: "Membros comuns não podem mais enviar mensagens.\nUse `/unlock` para destravar!", color: RED });
  },
  async unlock(body) {
    const gid = body.guild_id, cid = body.channel_id;
    const { beforeDeny } = await editEveryone(cid, gid, { denyDel: P.SEND_MESSAGES });
    if ((beforeDeny & P.SEND_MESSAGES) !== P.SEND_MESSAGES) return warn("Este canal já está desbloqueado.");
    return embed({ title: "🔓 | Canal desbloqueado!", description: "Os membros já podem enviar mensagens novamente.", color: GREEN });
  },
  async hide(body) {
    await editEveryone(body.channel_id, body.guild_id, { denyAdd: P.VIEW_CHANNEL });
    return embed({ title: "🙈 | Canal escondido", description: "Membros comuns não veem mais este canal.", color: GRAY });
  },
  async unhide(body) {
    await editEveryone(body.channel_id, body.guild_id, { denyDel: P.VIEW_CHANNEL });
    return embed({ title: "👁️ | Canal visível", description: "O canal voltou a aparecer para @everyone.", color: GREEN });
  },
  async slowmode(body) {
    const sec = parseDuration(opt(body, "tempo"));
    if (sec === null || sec < 0 || sec > 21600) return fail("Tempo inválido. Use ex.: `5s`, `1m`, `10m`, `1h` ou `off`.");
    await bot(`/channels/${body.channel_id}`, "PATCH", { rate_limit_per_user: sec });
    return ok("🐌 Slowmode atualizado", sec === 0 ? "Slowmode **desativado**." : `Agora: **${fmtDur(sec)}** entre mensagens.`);
  },
  async rename(body) {
    let nome = String(opt(body, "nome") || "").trim();
    if (!nome) return fail("Informe um nome.");
    return bot(`/channels/${body.channel_id}`, "PATCH", { name: nome }).then(
      (c: any) => ok("✏️ Canal renomeado", `Novo nome: **#${c.name}**`),
      () => fail("Nome inválido para o Discord."));
  },
  async topic(body) {
    const texto = String(opt(body, "texto") || "");
    await bot(`/channels/${body.channel_id}`, "PATCH", { topic: texto });
    return ok("📝 Tópico atualizado", texto ? undefined : "O tópico foi **limpo**.");
  },
  async clear(body) {
    const qtd = Number(opt(body, "quantidade"));
    const msgs = await bot(`/channels/${body.channel_id}/messages?limit=${Math.min(qtd, 100)}`);
    const recent = msgs.filter((m: any) => Date.now() - snowflakeDate(m.id).getTime() < 14 * 864e5).map((m: any) => m.id);
    if (recent.length === 0) return warn("Nada para apagar (mensagens com mais de 14 dias não podem ser removidas em massa).");
    if (recent.length === 1) await bot(`/channels/${body.channel_id}/messages/${recent[0]}`, "DELETE");
    else await bot(`/channels/${body.channel_id}/messages/bulk-delete`, "POST", { messages: recent });
    return ok("🧹 Mensagens apagadas", `Removi **${recent.length}** mensagem(ns).`, true);
  },
  async purge(body) {
    const target = optUser(body, "usuario"); const qtd = Number(opt(body, "quantidade") || 50);
    const msgs = await bot(`/channels/${body.channel_id}/messages?limit=${Math.min(qtd, 100)}`);
    const ids = msgs.filter((m: any) => m.author?.id === target?.id && Date.now() - snowflakeDate(m.id).getTime() < 14 * 864e5).map((m: any) => m.id);
    if (ids.length === 0) return warn("Nenhuma mensagem recente desse usuário encontrada.");
    if (ids.length === 1) await bot(`/channels/${body.channel_id}/messages/${ids[0]}`, "DELETE");
    else await bot(`/channels/${body.channel_id}/messages/bulk-delete`, "POST", { messages: ids });
    return ok("🧹 Purge concluído", `Removi **${ids.length}** mensagem(ns) de <@${target?.id}>.`, true);
  },
  async lockdown(body) {
    const catId = opt(body, "categoria"); const gid = body.guild_id;
    const chans = (await bot(`/guilds/${gid}/channels`)).filter((c: any) => c.parent_id === catId && (c.type === 0 || c.type === 5));
    let n = 0; for (const c of chans) { try { await editEveryone(c.id, gid, { denyAdd: P.SEND_MESSAGES }); await staffAllowSend(c.id, gid); n++; } catch {} }
    return embed({ title: "🔒 Lockdown aplicado", description: `**${n}** canal(is) bloqueado(s) na categoria.`, color: RED });
  },
  async unlockdown(body) {
    const catId = opt(body, "categoria"); const gid = body.guild_id;
    const chans = (await bot(`/guilds/${gid}/channels`)).filter((c: any) => c.parent_id === catId && (c.type === 0 || c.type === 5));
    let n = 0; for (const c of chans) { try { await editEveryone(c.id, gid, { denyDel: P.SEND_MESSAGES }); n++; } catch {} }
    return embed({ title: "🔓 Lockdown desfeito", description: `**${n}** canal(is) desbloqueado(s).`, color: GREEN });
  },

  // ───────── MEMBROS ─────────
  async kick(body) {
    const t = optUser(body, "membro"); const motivo = opt(body, "motivo") || "Sem motivo";
    if (!t) return fail("Membro inválido.");
    const h = await canAct(body, t.member?.roles || []); if (h) return fail(h);
    try { await bot(`/guilds/${body.guild_id}/members/${t.id}`, "DELETE"); }
    catch (e: any) { return fail("Não consegui expulsar: " + e.message); }
    return embed({ title: "👢 Membro expulso", color: GREEN, fields: [
      { name: "Membro", value: `<@${t.id}>`, inline: true },
      { name: "Moderador", value: `<@${body.member.user.id}>`, inline: true },
      { name: "Motivo", value: String(motivo) }] });
  },
  async ban(body) {
    const t = optUser(body, "membro"); const motivo = opt(body, "motivo") || "Sem motivo";
    if (!t) return fail("Membro inválido.");
    const h = await canAct(body, t.member?.roles || []); if (h) return fail(h);
    try { await bot(`/guilds/${body.guild_id}/bans/${t.id}`, "PUT", { reason: String(motivo) }); }
    catch (e: any) { return fail("Não consegui banir: " + e.message); }
    return embed({ title: "🔨 Membro banido", color: RED, fields: [
      { name: "Membro", value: `<@${t.id}>`, inline: true },
      { name: "Moderador", value: `<@${body.member.user.id}>`, inline: true },
      { name: "Motivo", value: String(motivo) }] });
  },
  async unban(body) {
    const id = String(opt(body, "usuario") || "").replace(/\D/g, "");
    if (!id) return fail("Informe um ID válido.");
    try { await bot(`/guilds/${body.guild_id}/bans/${id}`, "DELETE"); }
    catch { return warn("Esse usuário não estava banido (ou ID inválido)."); }
    return ok("✅ Ban removido", `<@${id}> foi desbanido.`);
  },
  async timeout(body) {
    const t = optUser(body, "membro"); const sec = parseDuration(opt(body, "tempo"));
    if (!t) return fail("Membro inválido.");
    if (sec === null || sec <= 0 || sec > 2419200) return fail("Tempo inválido (máx. 28 dias). Ex.: `10m`, `1h`, `1d`.");
    const h = await canAct(body, t.member?.roles || []); if (h) return fail(h);
    const until = new Date(Date.now() + sec * 1000).toISOString();
    try { await bot(`/guilds/${body.guild_id}/members/${t.id}`, "PATCH", { communication_disabled_until: until }); }
    catch (e: any) { return fail("Não consegui aplicar: " + e.message); }
    return ok("⏳ Timeout aplicado", `<@${t.id}> silenciado por **${fmtDur(sec)}**.`);
  },
  async untimeout(body) {
    const t = optUser(body, "membro"); if (!t) return fail("Membro inválido.");
    await bot(`/guilds/${body.guild_id}/members/${t.id}`, "PATCH", { communication_disabled_until: null });
    return ok("✅ Timeout removido", `<@${t.id}> pode falar novamente.`);
  },
  async nick(body) {
    const t = optUser(body, "membro"); const nome = opt(body, "nome") ?? null;
    if (!t) return fail("Membro inválido.");
    const h = await canAct(body, t.member?.roles || []); if (h) return fail(h);
    try { await bot(`/guilds/${body.guild_id}/members/${t.id}`, "PATCH", { nick: nome || null }); }
    catch (e: any) { return fail("Não consegui alterar: " + e.message); }
    return ok("🏷️ Apelido atualizado", nome ? `Novo apelido de <@${t.id}>: **${nome}**` : `Apelido de <@${t.id}> removido.`);
  },
  async role(body) {
    const t = optUser(body, "membro"); const roleId = opt(body, "cargo");
    if (!t || !roleId) return fail("Membro/cargo inválido.");
    const { pos } = await rolePositions(body.guild_id);
    const botId = process.env.AUTH_DISCORD_ID!;
    try { const bm = await bot(`/guilds/${body.guild_id}/members/${botId}`); if ((pos[roleId] || 0) >= highest(bm.roles || [], pos)) return fail("Esse cargo está acima do meu — suba o cargo do bot."); } catch {}
    const has = (t.member?.roles || []).includes(roleId);
    await bot(`/guilds/${body.guild_id}/members/${t.id}/roles/${roleId}`, has ? "DELETE" : "PUT");
    return ok(has ? "➖ Cargo removido" : "➕ Cargo adicionado", `<@&${roleId}> ${has ? "removido de" : "adicionado a"} <@${t.id}>.`);
  },

  // ───────── INFORMAÇÕES ─────────
  async serverinfo(body) {
    const g = await bot(`/guilds/${body.guild_id}?with_counts=true`);
    const chans = await bot(`/guilds/${body.guild_id}/channels`);
    return embed({ title: `📋 ${g.name}`, color: BLUE,
      thumbnail: g.icon ? { url: `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` } : undefined,
      fields: [
        { name: "ID", value: g.id, inline: true },
        { name: "Dono", value: `<@${g.owner_id}>`, inline: true },
        { name: "Membros", value: String(g.approximate_member_count ?? "?"), inline: true },
        { name: "Canais", value: String(chans.length), inline: true },
        { name: "Cargos", value: String((g.roles || []).length || "?"), inline: true },
        { name: "Boosts", value: `Nível ${g.premium_tier} · ${g.premium_subscription_count || 0} boosts`, inline: true },
        { name: "Criado em", value: snowflakeDate(g.id).toLocaleDateString("pt-BR"), inline: true },
      ] });
  },
  async userinfo(body) {
    const t = optUser(body, "membro") || { id: body.member.user.id, user: body.member.user, member: body.member };
    const u = t.user || {}; const m = t.member || {};
    const av = u.avatar ? `https://cdn.discordapp.com/avatars/${t.id}/${u.avatar}.png?size=256` : undefined;
    return embed({ title: `👤 ${u.global_name || u.username || "Usuário"}`, color: BLUE,
      thumbnail: av ? { url: av } : undefined,
      fields: [
        { name: "Usuário", value: `${u.username || "?"}`, inline: true },
        { name: "ID", value: t.id, inline: true },
        { name: "Conta criada", value: snowflakeDate(t.id).toLocaleDateString("pt-BR"), inline: true },
        { name: "Entrou em", value: m.joined_at ? new Date(m.joined_at).toLocaleDateString("pt-BR") : "?", inline: true },
        { name: "Cargos", value: (m.roles || []).length ? (m.roles || []).map((r: string) => `<@&${r}>`).join(" ") : "nenhum" },
      ] });
  },
  async avatar(body) {
    const t = optUser(body, "membro") || { id: body.member.user.id, user: body.member.user };
    const u = t.user || {};
    const av = u.avatar ? `https://cdn.discordapp.com/avatars/${t.id}/${u.avatar}.png?size=1024` : `https://cdn.discordapp.com/embed/avatars/0.png`;
    return embed({ title: `🖼️ Avatar de ${u.global_name || u.username || ""}`, color: BLUE, image: { url: av }, description: `[Abrir em tamanho grande](${av})` });
  },
  async roles(body) {
    const roles = (await bot(`/guilds/${body.guild_id}/roles`)).filter((r: any) => r.name !== "@everyone").sort((a: any, b: any) => b.position - a.position);
    const list = roles.map((r: any) => `<@&${r.id}>`).join(" ") || "nenhum";
    return embed({ title: `📚 Cargos (${roles.length})`, description: list.slice(0, 3900), color: BLUE });
  },
  async channelinfo(body) {
    const c = await bot(`/channels/${body.channel_id}`);
    const types: Record<number, string> = { 0: "Texto", 2: "Voz", 4: "Categoria", 5: "Anúncio", 13: "Palco", 15: "Fórum" };
    return embed({ title: `# ${c.name}`, color: BLUE, fields: [
      { name: "ID", value: c.id, inline: true },
      { name: "Tipo", value: types[c.type] || String(c.type), inline: true },
      { name: "Posição", value: String(c.position ?? "?"), inline: true },
      { name: "Slowmode", value: c.rate_limit_per_user ? `${c.rate_limit_per_user}s` : "off", inline: true },
      { name: "Categoria", value: c.parent_id ? `<#${c.parent_id}>` : "nenhuma", inline: true },
      { name: "Criado em", value: snowflakeDate(c.id).toLocaleDateString("pt-BR"), inline: true },
      ...(c.topic ? [{ name: "Tópico", value: String(c.topic).slice(0, 1000) }] : []),
    ] });
  },
  async botinfo(body) {
    const t0 = Date.now(); let guilds = 0;
    try { guilds = (await bot(`/users/@me/guilds`)).length; } catch {}
    const ping = Date.now() - t0;
    return embed({ title: "🤖 zoiudoAI", color: BLUE, fields: [
      { name: "Versão", value: "1.0", inline: true },
      { name: "Servidores", value: `${guilds}+`, inline: true },
      { name: "Latência (API)", value: `${ping}ms`, inline: true },
      { name: "Plataforma", value: "Serverless (Vercel) · Discord API v10", inline: false },
      { name: "Recursos", value: "Criação de servidores por IA + moderação + comandos divertidos", inline: false },
    ] });
  },
  async cmds() {
    const desc =
`🔒 **Moderação / Canais**
\`/lock\` \`/unlock\` \`/slowmode\` \`/clear\` \`/purge\` \`/hide\` \`/unhide\` \`/rename\` \`/topic\` \`/lockdown\` \`/unlockdown\`

👤 **Membros**
\`/kick\` \`/ban\` \`/unban\` \`/timeout\` \`/untimeout\` \`/nick\` \`/role\`

📋 **Informações**
\`/serverinfo\` \`/userinfo\` \`/avatar\` \`/roles\` \`/channelinfo\` \`/botinfo\`

🎲 **Diversão**
\`/guloso\` \`/gay\` \`/burro\` \`/gato\` \`/fofo\` \`/corno\`

🛠️ **Criação de servidor**
Feita pelo site (painel do zoiudoAI) — descreva e o bot monta canais, cargos e permissões.`;
    return embed({ title: "📖 Comandos do zoiudoAI", description: desc, color: 0x7c6cff });
  },
};

const MOD_NAMES = new Set(Object.keys(H));

/** Retorna a resposta se for um comando de moderação/info; senão null (pra cair nos divertidos). */
export async function handleMod(body: any): Promise<any | null> {
  const name = body?.data?.name;
  if (!name || !MOD_NAMES.has(name)) return null;
  try {
    return await H[name](body);
  } catch (e: any) {
    if (e?.status === 403) return fail("Não tenho permissão suficiente pra isso. Dê ao bot as permissões necessárias e suba o cargo dele.");
    return fail("Não foi possível realizar esta ação. " + (e?.message || ""));
  }
}
