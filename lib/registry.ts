import { FUN_COMMANDS } from "./funCommands";
import { MOD_COMMANDS } from "./modCommands";
import { listCustom, customToDef } from "./customCommands";

export async function allCommandDefs(): Promise<any[]> {
  const fun = FUN_COMMANDS.map((c: any) => ({
    name: c.name, description: (c.description || `Descobre quantos % ${c.adjective} alguém é`).slice(0, 100),
    options: [{ type: 6, name: "alvo", description: "Quem você quer medir?", required: true }],
  }));
  let custom: any[] = [];
  try { custom = (await listCustom()).map(customToDef); } catch {}
  return [...fun, ...MOD_COMMANDS, ...custom];
}

export async function registerGlobal(): Promise<{ ok: boolean; status: number; count: number }> {
  const appId = process.env.AUTH_DISCORD_ID, token = process.env.DISCORD_BOT_TOKEN;
  if (!appId || !token) throw new Error("faltam AUTH_DISCORD_ID/DISCORD_BOT_TOKEN");
  const defs = await allCommandDefs();
  const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
    method: "PUT", headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(defs),
  });
  return { ok: res.ok, status: res.status, count: defs.length };
}
