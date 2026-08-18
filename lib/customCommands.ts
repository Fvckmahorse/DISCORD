import { kvGet, kvSet, kvDel, kvSAdd, kvSRem, kvSMembers, kvReady } from "./kv";

export type CustomType = "percent" | "random" | "fixed" | "action" | "image";
export type CustomCommand = {
  name: string; description: string; type: CustomType; data: string; permission: string | null; image?: string;
};
const IDX = "cmds:index";

export async function listCustom(): Promise<CustomCommand[]> {
  if (!kvReady()) return [];
  const names = await kvSMembers(IDX); const out: CustomCommand[] = [];
  for (const n of names) { const c = await kvGet<CustomCommand>("cmd:" + n); if (c) out.push(c); }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
export async function getCustom(name: string): Promise<CustomCommand | null> {
  if (!kvReady()) return null; return kvGet<CustomCommand>("cmd:" + name);
}
export async function saveCustom(c: CustomCommand) { await kvSet("cmd:" + c.name, c); await kvSAdd(IDX, c.name); }
export async function deleteCustom(name: string) { await kvDel("cmd:" + name); await kvSRem(IDX, name); }

export function customToDef(c: CustomCommand): any {
  const o: any = { name: c.name, description: (c.description || c.name).slice(0, 100) };
  if (c.permission) o.default_member_permissions = c.permission;
  if (c.type === "percent" || c.type === "action") o.options = [{ type: 6, name: "alvo", description: "Quem?", required: c.type === "percent" }];
  else if (c.type === "image" || c.type === "fixed") o.options = [];
  else o.options = [{ type: 6, name: "alvo", description: "Alguém (opcional)", required: false }];
  return o;
}

/** Retorna o objeto `data` da resposta da interação (content e/ou embeds). */
export function buildCustomInteraction(c: CustomCommand, body: any): any {
  const opt = (body.data?.options || []).find((o: any) => o.name === "alvo");
  const targetId = opt?.value;
  const caller = body.member?.user?.id || body.user?.id;
  const mention = targetId ? `<@${targetId}>` : `<@${caller}>`;
  const sub = (s: string) => s.replace(/\{user\}/g, `<@${caller}>`).replace(/\{alvo\}/g, mention);

  if (c.type === "image") {
    const text = sub(c.data || "");
    const embed: any = { color: 0x7c6cff };
    if (text) embed.description = text;
    if (c.image) embed.image = { url: c.image };
    return { embeds: [embed], allowed_mentions: { parse: ["users"] } };
  }
  return { content: buildCustomResponse(c, body), allowed_mentions: { parse: ["users"] } };
}

export function buildCustomResponse(c: CustomCommand, body: any): string {
  const opt = (body.data?.options || []).find((o: any) => o.name === "alvo");
  const targetId = opt?.value;
  const caller = body.member?.user?.id || body.user?.id;
  const mention = targetId ? `<@${targetId}>` : `<@${caller}>`;
  const sub = (s: string) => s.replace(/\{user\}/g, `<@${caller}>`).replace(/\{alvo\}/g, mention);
  if (c.type === "percent") return `${mention} é **${Math.floor(Math.random() * 101)}%** ${c.data} 📊`;
  if (c.type === "random") { const lines = c.data.split("\n").map(s => s.trim()).filter(Boolean); return sub(lines[Math.floor(Math.random() * lines.length)] || "..."); }
  if (c.type === "action") return `<@${caller}> ${c.data} ${mention}`;
  return sub(c.data || "");
}
