/* Executor: cria a estrutura no Discord via REST usando o BOT token. */
import type { Config } from "./interpret";
import { displayChannel } from "./interpret";

const API = "https://discord.com/api/v10";

const BIT: Record<string, bigint> = {
  ADMINISTRATOR: 1n<<3n, KICK_MEMBERS: 1n<<1n, BAN_MEMBERS: 1n<<2n,
  MANAGE_CHANNELS: 1n<<4n, MANAGE_GUILD: 1n<<5n, VIEW_CHANNEL: 1n<<10n,
  SEND_MESSAGES: 1n<<11n, MANAGE_MESSAGES: 1n<<13n, ATTACH_FILES: 1n<<14n,
  MENTION_EVERYONE: 1n<<17n, MANAGE_ROLES: 1n<<28n, CREATE_PUBLIC_THREADS: 1n<<35n,
  MODERATE_MEMBERS: 1n<<40n,
};
const CH_TYPE: Record<string, number> = { text:0, voice:2, category:4, announcement:5, forum:15 };

function permsToBits(perms: string[]): string {
  let v = 0n;
  for (const p of perms) if (BIT[p]) v |= BIT[p];
  return v.toString();
}
function hexToInt(hex: string): number {
  const h = (hex||"").replace("#",""); const n = parseInt(h,16); return isNaN(n)?0:n;
}

async function dapi(path: string, method: string, body: any, token: string, log: string[]): Promise<any> {
  for (let attempt=0; attempt<5; attempt++) {
    const res = await fetch(API+path, {
      method,
      headers: { "Authorization": `Bot ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status===429) {
      const j = await res.json().catch(()=>({retry_after:1}));
      const wait = Math.min((j.retry_after ?? 1)*1000, 5000);
      await new Promise(r=>setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      const t = await res.text().catch(()=> "");
      throw new Error(`Discord ${res.status} em ${method} ${path}: ${t.slice(0,180)}`);
    }
    return res.status===204 ? {} : res.json();
  }
  throw new Error(`Rate limit persistente em ${path}`);
}

export type ApplyResult = { log: string[]; errors: string[]; created: { roles: number; categories: number; channels: number } };

export async function applyConfig(guildId: string, config: Config, token: string): Promise<ApplyResult> {
  const log: string[] = [], errors: string[] = [];
  const created = { roles: 0, categories: 0, channels: 0 };
  const keyToRoleId: Record<string,string> = {};

  // 1) cargos
  for (const role of config.roles) {
    try {
      const r = await dapi(`/guilds/${guildId}/roles`, "POST", {
        name: role.name, color: hexToInt(role.color), hoist: role.hoist,
        permissions: permsToBits(role.permissions),
        reason: "nigg AI",
      } as any, token, log);
      keyToRoleId[role.key] = r.id;
      created.roles++;
      log.push(`✓ Cargo criado: ${role.name}`);
    } catch (e: any) { errors.push(`Cargo "${role.name}": ${e.message}`); }
  }

  // 2) categorias + 3) canais
  for (const cat of config.categories) {
    const overwrites: any[] = [];
    if (cat.private) {
      overwrites.push({ id: guildId, type: 0, deny: BIT.VIEW_CHANNEL.toString() });
      for (const k of cat.allow) if (keyToRoleId[k]) overwrites.push({ id: keyToRoleId[k], type: 0, allow: BIT.VIEW_CHANNEL.toString() });
    }
    let categoryId: string | undefined;
    try {
      const c = await dapi(`/guilds/${guildId}/channels`, "POST", {
        name: cat.name, type: CH_TYPE.category, permission_overwrites: overwrites,
      } as any, token, log);
      categoryId = c.id; created.categories++;
      log.push(`✓ Categoria criada: ${cat.name}`);
    } catch (e: any) { errors.push(`Categoria "${cat.name}": ${e.message}`); continue; }

    for (const ch of cat.channels) {
      const chOverwrites: any[] = [];
      if (ch.readonly) chOverwrites.push({ id: guildId, type: 0, deny: (BIT.SEND_MESSAGES | BIT.CREATE_PUBLIC_THREADS).toString() });
      try {
        await dapi(`/guilds/${guildId}/channels`, "POST", {
          name: displayChannel(ch.raw, ch.type),
          type: CH_TYPE[ch.type] ?? 0,
          parent_id: categoryId,
          permission_overwrites: chOverwrites,
        } as any, token, log);
        created.channels++;
      } catch (e: any) { errors.push(`Canal "${ch.raw}": ${e.message}`); }
    }
    log.push(`  ↳ ${cat.channels.length} canal(is) em ${cat.name}`);
  }

  return { log, errors, created };
}
