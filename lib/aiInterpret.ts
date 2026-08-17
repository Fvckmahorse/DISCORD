/* Interpretação por IA (Google Gemini, free tier).
   Usa o "manual de raciocínio" como system prompt e devolve JSON validado
   no mesmo formato Config que o resto do app usa. */
import type { Config, Cat, Ch, Role, Result } from "./interpret";

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const ROLE_COLORS = ["#f1c40f","#5865f2","#43b581","#e67e22","#e74c3c","#9b59b6","#1abac6","#95a5a6"];
const PERMS = ["ADMINISTRATOR","MANAGE_MESSAGES","MODERATE_MEMBERS","BAN_MEMBERS","KICK_MEMBERS","MANAGE_CHANNELS","MANAGE_ROLES","ATTACH_FILES","MENTION_EVERYONE","MANAGE_GUILD"];

const SYSTEM = `Você é o cérebro do zoiudoAI: interpreta pedidos em português para montar servidores do Discord.

REGRA MAIS IMPORTANTE: NUNCA transforme uma instrução, regra, explicação ou frase descritiva em nome de categoria, canal ou cargo. Só vira objeto o que o usuário realmente apresentou como categoria/canal/cargo.

Frases como "somente leitura", "privado", "visível apenas para...", "com os canais", "todos os canais devem...", "mantenha organizado", "não crie duplicados", "hierarquia", "padrão" são INSTRUÇÕES, nunca nomes.

EMOJIS: se o usuário pedir emojis nos canais/categorias, isso é regra de FORMATAÇÃO — escolha um emoji que combine com CADA nome (ex.: regras→📜, anúncios→📢, chat-geral→💬, novidades→🆕, staff→🔒). Nunca crie um canal com o texto da instrução.

CATEGORIA PRIVADA: configure permissões (não crie canais representando permissões). Liste em "allow" os cargos que podem ver.

SOMENTE LEITURA: marque readonly=true (o @everyone perde envio, mantém ver).

NÃO DUPLICAR: não repita categorias/canais/cargos com o mesmo objetivo.

Responda SOMENTE com um JSON (sem texto fora dele, sem markdown) neste formato exato:
{
  "server": { "name": string|null },
  "roles": [ { "name": string, "permissions": string[], "hoist": boolean } ],
  "categories": [
    {
      "name": string,
      "emoji": string|null,
      "private": boolean,
      "allow": string[],            // nomes dos cargos que podem ver (se private)
      "channels": [ { "name": string, "type": "text"|"voice"|"announcement"|"forum", "readonly": boolean, "emoji": string|null } ]
    }
  ]
}
"permissions" só pode conter: ${PERMS.join(", ")}. Não invente permissões. Não dê ADMINISTRATOR a @everyone. Se o pedido não mencionar algo, use listas vazias / false / null.`;

function pickPerms(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(String).map(s => s.toUpperCase().trim()).filter(p => PERMS.includes(p));
}

function toConfig(ai: any): Config {
  const roles: Role[] = (ai?.roles || []).map((r: any, i: number) => ({
    key: norm(r?.name || ""), name: String(r?.name || "").trim(),
    color: ROLE_COLORS[i % ROLE_COLORS.length], permissions: pickPerms(r?.permissions), hoist: !!r?.hoist,
  })).filter((r: Role) => r.name);

  const categories: Cat[] = (ai?.categories || []).map((c: any) => {
    const channels: Ch[] = (c?.channels || []).map((ch: any) => ({
      raw: String(ch?.name || "").trim(),
      type: ["text","voice","announcement","forum"].includes(ch?.type) ? ch.type : "text",
      readonly: !!ch?.readonly,
      emoji: ch?.emoji || undefined,
    })).filter((ch: Ch) => ch.raw);
    return {
      name: String(c?.name || "").trim(), emoji: c?.emoji || undefined,
      private: !!c?.private, allow: (c?.allow || []).map((x: any) => norm(String(x))), channels,
    };
  }).filter((c: Cat) => c.name);

  return { server: { name: (ai?.server?.name || "Meu Servidor").toString() }, roles, categories };
}

function applySafety(config: Config): { warnings: string[]; blocks: string[]; applied: string[] } {
  const warnings: string[] = [], blocks: string[] = [], applied: string[] = [];
  const ownerRole = config.roles.find(r => /owner|dono|admin/.test(r.key));
  config.categories.forEach(cat => {
    if (cat.private) {
      if (ownerRole && !cat.allow.includes(ownerRole.key)) { cat.allow.push(ownerRole.key); applied.push(`Adicionei "${ownerRole.name}" ao acesso de "${cat.name}".`); }
      if (!ownerRole) warnings.push(`A categoria "${cat.name}" é privada, mas não há cargo Owner/Admin.`);
    }
  });
  config.roles.forEach(r => { if (r.permissions.includes("ADMINISTRATOR")) applied.push(`O cargo "${r.name}" recebeu Administrador.`); });
  let total = 0;
  config.categories.forEach(cat => { total += cat.channels.length; if (cat.channels.length > 50) warnings.push(`"${cat.name}" tem ${cat.channels.length} canais (máx. 50 por categoria no Discord).`); });
  if (total > 500) warnings.push(`${total} canais no total (máx. 500 por servidor).`);
  if (total > 0) applied.push(`${total} canais em ${config.categories.length} categoria(s).`);
  return { warnings, blocks, applied };
}

export async function aiInterpret(text: string): Promise<Result> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("sem GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: text }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("resposta vazia da IA");
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); }

  const config = toConfig(parsed);
  const { warnings, blocks, applied } = applySafety(config);
  return { config, warnings, blocks, applied };
}
