/**
 * Utilidades do Discord usadas no servidor (backend).
 * - listUserGuilds: lista os servidores do usuário via token OAuth dele.
 * - canManage: filtra onde ele é dono OU tem a permissão "Gerenciar Servidor".
 * - addBotUrl: link oficial pra adicionar NOSSO bot num servidor.
 */

// Permissões (bitfield do Discord)
const MANAGE_GUILD = 1n << 5n;       // 0x20  — "Gerenciar Servidor"
const ADMINISTRATOR = 1n << 3n;      // 0x08  — "Administrador"

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // string decimal do bitfield
};

export async function listUserGuilds(accessToken: string): Promise<Guild[]> {
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    // guilds mudam pouco; cache curto evita rate limit
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("DISCORD_TOKEN_EXPIRED");
    throw new Error(`Discord respondeu ${res.status}`);
  }
  return (await res.json()) as Guild[];
}

export function canManage(g: Guild): boolean {
  if (g.owner) return true;
  const perms = BigInt(g.permissions || "0");
  return (perms & MANAGE_GUILD) === MANAGE_GUILD || (perms & ADMINISTRATOR) === ADMINISTRATOR;
}

export function iconUrl(g: Guild): string | null {
  return g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null;
}

/**
 * Permissões que o BOT vai pedir ao ser adicionado. Mantemos o mínimo
 * necessário pra criar/organizar estrutura (nada de banir/kick por padrão).
 * Manage Channels + Manage Roles + View Channels + Send Messages.
 */
export const BOT_PERMISSIONS =
  (1n << 4n) |   // MANAGE_CHANNELS
  (1n << 28n) |  // MANAGE_ROLES
  (1n << 10n) |  // VIEW_CHANNEL
  (1n << 11n);   // SEND_MESSAGES

export function addBotUrl(guildId?: string): string {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!;
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: BOT_PERMISSIONS.toString(),
    scope: "bot applications.commands",
  });
  if (guildId) {
    params.set("guild_id", guildId);
    params.set("disable_guild_select", "true");
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** Verifica se o NOSSO bot já está num servidor (via bot token). */
export async function botInGuild(guildId: string): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${token}` },
    });
    return res.ok; // 200 = bot está no servidor; 403/404 = não está
  } catch { return false; }
}
