/* Interpretação por IA (Google Gemini, free tier).
   Usa o "manual de raciocínio" como system prompt e devolve JSON no formato Config.
   Tenta vários modelos e reporta o erro real se todos falharem. */
import type { Config, Cat, Ch, Role, Result } from "./interpret";

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const ROLE_COLORS = ["#f1c40f","#5865f2","#43b581","#e67e22","#e74c3c","#9b59b6","#1abac6","#95a5a6"];
const PERMS = ["ADMINISTRATOR","MANAGE_MESSAGES","MODERATE_MEMBERS","BAN_MEMBERS","KICK_MEMBERS","MANAGE_CHANNELS","MANAGE_ROLES","ATTACH_FILES","MENTION_EVERYONE","MANAGE_GUILD"];

const SYSTEM = `Você é o MOTOR DE INTERPRETAÇÃO de um bot que cria servidores Discord.
Sua função é entender a INTENÇÃO completa do usuário (linguagem natural, informal, longa ou curta) e transformar em estrutura Discord válida. INTENÇÃO DO USUÁRIO > PALAVRAS ISOLADAS.

REGRA ABSOLUTA: NUNCA crie categoria, canal ou cargo a partir de uma frase de INSTRUÇÃO.
São instruções (nunca viram nomes): "crie", "adicione", "com os canais", "todos os canais", "os canais devem", "seguido de", "somente leitura", "privada", "privado", "visível somente para", "não crie duplicados", "padrão", "especial", "hierarquia", "permissões", "configure", "mantenha", "obrigatoriamente", "devem", "deve".

SEPARE NOME DE CONFIGURAÇÃO:
- "STAFF privada" => name:"STAFF", private:true. NUNCA name:"STAFF privada".
- "regras somente leitura" => name:"regras", readonly:true. NUNCA name:"regras somente leitura".
- "STAFF deve ser privada" (STAFF já existe) => só muda config; NÃO cria outra STAFF.

CATEGORIA PRIVADA: private:true e liste em "allow" os cargos que podem ver. Não crie canais representando permissões.

EMOJIS (quando o usuário pedir): é regra de FORMATAÇÃO. Escolha um emoji que combine com CADA nome. Preencha o campo "emoji" de cada categoria/canal (só o emoji, ex.: "📢"). O app junta como "emoji┃nome". Ex.: regras→📜, anúncios→📢, novidades→🆕, chat-geral→💬, memes→😂, sugestões→💡, ajuda→🆘, staff→🔒, informações→📚, comunidade→💬, gaming→🎮, voz→🔊. NUNCA coloque o texto da instrução como nome.

CARGOS: só os explicitamente pedidos. "hierarquia" indica a ORDEM (de cima pra baixo), não é um cargo.

NÃO DUPLICAR: não repita categorias/canais/cargos com o mesmo objetivo.

Responda SOMENTE com um JSON (sem markdown, sem texto fora) neste formato:
{
  "server": { "name": string|null },
  "roles": [ { "name": string, "permissions": string[], "hoist": boolean } ],
  "categories": [
    { "name": string, "emoji": string|null, "private": boolean, "allow": string[],
      "channels": [ { "name": string, "type": "text"|"voice"|"announcement"|"forum", "readonly": boolean, "emoji": string|null } ] }
  ]
}
"permissions" só pode conter: ${PERMS.join(", ")}. Nunca ADMINISTRATOR para @everyone. Campos não mencionados: use [] / false / null.`;

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
      readonly: !!ch?.readonly, emoji: ch?.emoji || undefined,
    })).filter((ch: Ch) => ch.raw);
    return { name: String(c?.name || "").trim(), emoji: c?.emoji || undefined,
      private: !!c?.private, allow: (c?.allow || []).map((x: any) => norm(String(x))), channels };
  }).filter((c: Cat) => c.name);
  return { server: { name: (ai?.server?.name || "Meu Servidor").toString() }, roles, categories };
}
function applySafety(config: Config) {
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
  config.categories.forEach(cat => { total += cat.channels.length; if (cat.channels.length > 50) warnings.push(`"${cat.name}" tem ${cat.channels.length} canais (máx. 50/categoria).`); });
  if (total > 500) warnings.push(`${total} canais no total (máx. 500/servidor).`);
  if (total > 0) applied.push(`${total} canais em ${config.categories.length} categoria(s).`);
  return { warnings, blocks, applied };
}
function parseJson(raw: string): any {
  try { return JSON.parse(raw); } catch { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
}

async function callModel(model: string, key: string, text: string): Promise<Result> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 140)}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error(`${model}: resposta vazia ${JSON.stringify(data?.promptFeedback || {}).slice(0, 100)}`);
  const config = toConfig(parseJson(raw));
  const s = applySafety(config);
  return { config, ...s };
}

// Descobre os modelos que a chave realmente tem acesso (e que suportam generateContent).
async function discoverModels(key: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (!res.ok) return [];
    const data = await res.json();
    const models: string[] = (data?.models || [])
      .filter((m: any) => (m?.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: any) => String(m?.name || "").replace(/^models\//, ""))
      .filter((n: string) => n && /gemini/i.test(n) && !/vision|embedding|aqa|imagen|tts|image/i.test(n));
    const score = (m: string) => (/flash/.test(m) ? 10 : 0) + (/2\.5/.test(m) ? 5 : 0) + (/2\.0/.test(m) ? 4 : 0) + (/pro/.test(m) ? 2 : 0) + (/latest/.test(m) ? 1 : 0) - (/lite|thinking|exp|preview/.test(m) ? 2 : 0);
    return models.sort((a, b) => score(b) - score(a));
  } catch { return []; }
}

let cachedModel: string | null = null;

export async function aiInterpret(text: string): Promise<Result> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("sem GEMINI_API_KEY");

  const staticList = [process.env.GEMINI_MODEL, cachedModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]
    .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) as string[];

  let lastErr = "";
  for (const model of staticList) {
    try { const r = await callModel(model, key, text); cachedModel = model; return r; }
    catch (e: any) { lastErr = String(e?.message || e); }
  }

  // Se a lista fixa falhou (nomes 404), descobre os modelos reais da conta.
  const discovered = await discoverModels(key);
  for (const model of discovered) {
    if (staticList.includes(model)) continue;
    try { const r = await callModel(model, key, text); cachedModel = model; return r; }
    catch (e: any) { lastErr = String(e?.message || e); }
  }

  const hint = discovered.length
    ? ` | modelos da sua conta: ${discovered.slice(0, 6).join(", ")}`
    : " | nenhum modelo encontrado (ative a 'Generative Language API' e use uma chave do aistudio.google.com/apikey)";
  throw new Error(lastErr + hint);
}
