/* Interpretador local (texto -> estrutura). Porta do protótipo da Fase 1. */

export type Ch = { raw: string; type: "text" | "voice" | "announcement" | "forum"; readonly: boolean; emoji?: string };
export type Cat = { name: string; private: boolean; allow: string[]; channels: Ch[]; emoji?: string };
export type Role = { key: string; name: string; color: string; permissions: string[]; hoist: boolean };
export type Config = { server: { name: string }; roles: Role[]; categories: Cat[] };
export type Result = { config: Config; warnings: string[]; blocks: string[]; applied: string[] };

const ROLE_SYNONYMS: string[][] = [
  ["owner","dono","dona","proprietario","proprietário","owners","donos"],
  ["developer","developers","dev","devs","desenvolvedor","desenvolvedores"],
  ["animator","animators","animador","animadores"],
  ["moderator","moderators","moderador","moderadores","mod","mods"],
  ["tester","testers","testador","testadores"],
  ["member","members","membro","membros"],
  ["admin","admins","administrador","administradores"],
];
const ROLE_COLORS = ["#f1c40f","#5865f2","#43b581","#e67e22","#e74c3c","#9b59b6","#1abac6","#95a5a6"];

const PERM_RULES: { re: RegExp; perm: string }[] = [
  { re:/(fazer tudo|todas as permiss|administra(dor|tiva|r)|admin total|controle total|poder total)/, perm:"ADMINISTRATOR" },
  { re:/(apagar|deletar|gerenciar|remover|excluir) (as )?mensagens/, perm:"MANAGE_MESSAGES" },
  { re:/(moderar|silenciar|castigar|dar timeout|timeout)/, perm:"MODERATE_MEMBERS" },
  { re:/(banir|ban)/, perm:"BAN_MEMBERS" },
  { re:/(expulsar|kickar|chutar)/, perm:"KICK_MEMBERS" },
  { re:/(gerenciar|criar|editar) (os )?canais/, perm:"MANAGE_CHANNELS" },
  { re:/(gerenciar|criar|editar) (os )?cargos/, perm:"MANAGE_ROLES" },
  { re:/(anexar|enviar) arquivos/, perm:"ATTACH_FILES" },
  { re:/(mencionar|marcar) (o )?@?everyone/, perm:"MENTION_EVERYONE" },
  { re:/(gerenciar|configurar) (o )?servidor/, perm:"MANAGE_GUILD" },
];

export const PERM_LABEL: Record<string,string> = {
  ADMINISTRATOR:"Administrador", MANAGE_MESSAGES:"Gerenciar msgs", MODERATE_MEMBERS:"Moderar",
  BAN_MEMBERS:"Banir", KICK_MEMBERS:"Expulsar", MANAGE_CHANNELS:"Gerenciar canais",
  MANAGE_ROLES:"Gerenciar cargos", ATTACH_FILES:"Anexar arquivos", MENTION_EVERYONE:"Marcar @everyone",
  MANAGE_GUILD:"Gerenciar servidor",
};

const norm = (s: string) => (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
const clean = (s: string) => (s||"").replace(/^[#\s🔊📢💬🗣️•\-–"'“”*]+/,"").replace(/["'“”*.,;:!]+$/,"").trim();

/** Normaliza o texto antes de interpretar: tira asteriscos de ênfase (*10*)
 *  e converte aspas curvas em retas, pra não atrapalhar as regras. */
function preprocess(t: string): string {
  return (t||"").replace(/\r/g,"").replace(/[*]/g,"").replace(/[“”„]/g,'"').replace(/[‘’]/g,"'");
}

function variantsFor(nameLower: string): string[] {
  for (const g of ROLE_SYNONYMS) if (g.includes(nameLower)) return g;
  return [nameLower, nameLower+"s"];
}
function splitList(str: string): string[] {
  return str.split(/,| e | & |\band\b|\/|\n/i).map(clean).filter(x => x && x.length<=40);
}
function inferType(name: string): Ch["type"] {
  const n = norm(name);
  if (/\bvoz\b|🔊|voice|call|sala de voz/.test(n)) return "voice";
  if (/forum|fórum/.test(n)) return "forum";
  if (/anunc|announce/.test(n)) return "announcement";
  return "text";
}
export function displayChannel(name: string, type: string): string {
  let base = clean(name).replace(/^canal (de voz|de texto|de an[uú]ncios?|de f[oó]rum|)\s*/i,"");
  base = base.replace(/\s*(de\s+)?voz$/i,"").trim();
  if (type==="voice") return base || "Voz";
  return norm(base).replace(/[^a-z0-9\s_-]/g,"").trim().replace(/\s+/g,"-") || "canal";
}

export function interpret(text: string): Result {
  const warnings: string[] = [], blocks: string[] = [], applied: string[] = [];
  const config: Config = { server:{ name:"Meu Servidor" }, roles:[], categories:[] };
  const raw = preprocess(text);
  const lowerAll = norm(raw);
  const sentences = raw.split(/(?<=[.\n!?])/).map(s=>s.trim()).filter(Boolean);

  let m = raw.match(/servidor (?:chamado|chamada|com nome|nomeado)\s+["']?([^."'\n,]{2,40})/i);
  if (m) config.server.name = clean(m[1]);

  // cargos
  const roleRe = /cargos?\s+([^.\n]+)/gi; let rm: RegExpExecArray | null;
  const foundRoles: string[] = [];
  while ((rm = roleRe.exec(raw))) {
    let seg = rm[1].split(/\b(que|para|pra|com|onde|e que)\b/i)[0];
    splitList(seg).forEach(r => { if (r && !/^(sao|são|abaixo|seguintes|os|as)$/i.test(r)) foundRoles.push(r); });
  }
  const seen = new Set<string>();
  foundRoles.forEach(rname => {
    const key = norm(rname);
    if (!key || seen.has(key)) return; seen.add(key);
    config.roles.push({ key, name:clean(rname), color:ROLE_COLORS[config.roles.length % ROLE_COLORS.length], permissions:[], hoist:false });
  });
  config.roles.forEach(role => {
    const vars = variantsFor(role.key);
    sentences.forEach(sen => {
      const s = norm(sen);
      if (!vars.some(v => new RegExp("\\b"+v+"\\b").test(s))) return;
      PERM_RULES.forEach(rule => { if (rule.re.test(s) && !role.permissions.includes(rule.perm)) role.permissions.push(rule.perm); });
    });
  });

  // categorias + canais
  function genNumbered(base: string, a: number, b: number): string[] { const o: string[]=[]; base=base.replace(/\s+$/,""); for (let i=a;i<=b;i++) o.push(base+i); return o; }
  function extractChannels(s: string): Ch[] {
    const out: Ch[] = [];
    const push = (name: string, type?: Ch["type"]) => { const k=norm(name); if (k && !out.some(o=>norm(o.raw)===k)) out.push({ raw:clean(name), type:(type||inferType(name)), readonly:false }); };
    const r = s.match(/["']?([a-zà-ú][a-zà-ú_-]*?)["']?\s*(\d+)["']?[\s\d,."'\u2026-]*?(?:at[eé]|\bao?\b|\bà\b|-)\s*(?:o\s+)?["']?(?:[a-zà-ú][a-zà-ú_-]*)?["']?\s*(\d+)["']?/i);
    if (r) {
      const base=clean(r[1]).replace(/\d+$/,""); const a=parseInt(r[2],10), b=parseInt(r[3],10);
      if (base && !/^(o|a|os|as|de|com|e|at[eé]|cana(l|is)|categoria|para|numerados?|nomeados?)$/i.test(base) && b>=a && (b-a)<=2000)
        genNumbered(base,a,b).forEach(n=>push(n,"text"));
    }
    if (!out.length) {
      const c = s.match(/(\d+)\s+canais(\s+de voz|\s+de texto)?\s*(?:nomeados?|chamados?|com o nome(?: de)?|de nome|de|com)?\s*["']?([a-zà-ú][a-zà-ú0-9 _-]*?)?["']?(?=[.,\n]|$)/i);
      if (c) {
        const n=parseInt(c[1],10); let base=clean(c[4]||"").replace(/\d+$/,"").trim(); const voice=/de voz/i.test(c[2]||"");
        if (!base || /^(voz|texto|nomeados?|chamados?|de|com)$/i.test(base)) base="canal";
        if (n>0 && n<=2000) genNumbered(base,1,n).forEach(x=>push(x, voice?"voice":"text"));
      }
    }
    if (!out.length) {
      const l = s.match(/canais?\s+(?:nomeados?\s+|chamados?\s+)?(?:de\s+)?([^.\n]+)/i);
      if (l) splitList(l[1]).forEach(tok => { if (!/^\d+$/.test(tok)) push(tok, inferType(tok)); });
    }
    return out;
  }
  const catDeclRe = /categ[a-zà-ú]*\s+(privada\s+)?(?:com\s+(?:o\s+)?nome\s+de\s+|com\s+(?:o\s+)?nome\s+|chamada\s+|chamado\s+|nomeada\s+de\s+|nomeada\s+|de\s+nome\s+|de\s+|para\s+(?:a|o)?\s*|pra\s+)?["']?([a-zà-ú0-9][a-zà-ú0-9 _-]{1,39}?)["']?(?=$|[.,:"']|\s+(?:privada|com\b|e\b|contendo|:))/i;
  let currentCat: Cat | null = null;
  sentences.forEach(sen => {
    const decl = sen.match(catDeclRe);
    if (decl) {
      const cname = clean(decl[2]);
      if (cname && !/^cana(l|is)$/i.test(cname)) {
        let cat = config.categories.find(c => norm(c.name)===norm(cname));
        if (!cat) { cat = { name:cname, private:false, allow:[], channels:[] }; config.categories.push(cat); }
        if (decl[1] || /privad/i.test(sen)) cat.private = true;
        currentCat = cat;
      }
    }
    const chans = extractChannels(sen);
    if (chans.length) {
      let cat = currentCat;
      if (!cat) { cat = config.categories.find(c=>norm(c.name)==="geral") || null; if (!cat) { cat = { name:"Geral", private:false, allow:[], channels:[] }; config.categories.push(cat);} currentCat = cat; }
      chans.forEach(ch => { if (!cat!.channels.some(x=>norm(x.raw)===norm(ch.raw))) cat!.channels.push(ch); });
    }
  });

  // somente leitura
  sentences.forEach(sen => {
    const s = norm(sen);
    if (!/(somente|so|só|apenas)\s*-?\s*leitura|read.?only/.test(s)) return;
    config.categories.forEach(cat => cat.channels.forEach(ch => {
      if (new RegExp("\\b"+norm(ch.raw).replace(/[-\s]/g,"[-\\s]?")+"\\b").test(s)) ch.readonly = true;
      if (/anunc/.test(norm(ch.raw)) && /anunc/.test(s)) ch.readonly = true;
    }));
  });

  // acesso privado
  const accRe = /(?:somente|só|so|apenas)\s+(.+?)\s+(?:podem?|pode|tem acesso a|têm acesso a)\s+(?:acessar|ver|entrar em|ter acesso a)?\s*(?:a\s+|o\s+)?(?:categ[a-zà-ú]*|canal|área|area|sala)?\s*["']?([a-zà-ú0-9 _-]{2,30})/gi;
  let am: RegExpExecArray | null;
  while ((am = accRe.exec(raw))) {
    const roleTokens = splitList(am[1]).map(norm).filter(Boolean);
    const targetName = clean(am[2]);
    const allowKeys: string[] = [];
    roleTokens.forEach(tok => {
      const found = config.roles.find(r => variantsFor(r.key).some(v => tok===v || tok.includes(v)));
      if (found) allowKeys.push(found.key);
      else if (!/todos|membros|everyone/.test(tok)) warnings.push('Mencionou "'+tok+'" numa regra de acesso, mas não achei um cargo com esse nome.');
    });
    let cat = config.categories.find(c => norm(c.name)===norm(targetName) || norm(c.name).includes(norm(targetName)));
    if (!cat) { cat = { name:targetName, private:true, allow:[], channels:[] }; config.categories.push(cat);
      warnings.push('Criei a categoria "'+targetName+'" a partir de uma regra de acesso.'); }
    cat.private = true;
    allowKeys.forEach(k => { if (!cat!.allow.includes(k)) cat!.allow.push(k); });
  }
  sentences.forEach(sen => { const s=norm(sen); if (!/privad/.test(s)) return; config.categories.forEach(cat => { if (s.includes(norm(cat.name))) cat.private=true; }); });

  // travas de segurança
  if (/@?everyone.*(tudo|administra|admin|todas as permiss)/.test(lowerAll) || /(tudo|administra|admin).*@?everyone/.test(lowerAll))
    blocks.push("Bloqueado: dar Administrador para @everyone. Nunca é aplicado.");
  const ownerRole = config.roles.find(r => variantsFor(r.key).some(v=>["owner","admin"].includes(v)) || /owner|dono|admin/.test(r.key));
  config.categories.forEach(cat => {
    if (cat.private) {
      if (ownerRole && !cat.allow.includes(ownerRole.key)) { cat.allow.push(ownerRole.key); applied.push('Adicionei "'+ownerRole.name+'" ao acesso de "'+cat.name+'" (o dono não pode se trancar pra fora).'); }
      if (!ownerRole) warnings.push('A categoria "'+cat.name+'" é privada, mas não há cargo Owner/Admin — cuidado pra não se trancar pra fora.');
    }
  });
  config.roles.forEach(r => { if (r.permissions.includes("ADMINISTRATOR")) applied.push('O cargo "'+r.name+'" recebeu Administrador (controle total).'); });
  let totalCh = 0;
  config.categories.forEach(cat => { totalCh += cat.channels.length;
    if (cat.channels.length>50) warnings.push('A categoria "'+cat.name+'" tem '+cat.channels.length+' canais. O Discord permite no máximo 50 por categoria.'); });
  if (totalCh>500) warnings.push('São '+totalCh+' canais no total. O Discord permite no máximo 500 por servidor.');
  if (totalCh>0) applied.push(totalCh+' canais em '+config.categories.length+' categoria(s).');
  if (config.roles.length===0 && config.categories.length===0)
    warnings.push("Não identifiquei cargos nem categorias. Ex.: “Crie uma categoria X com os canais a, b, c” e “Crie os cargos A, B”.");

  return { config, warnings, blocks, applied };
}


function firstEmoji(s: string): string | undefined {
  const m = (s || "").match(/\p{Extended_Pictographic}(\uFE0F)?(\u200D\p{Extended_Pictographic}(\uFE0F)?)*/u);
  return m ? m[0] : undefined;
}
/** Remove qualquer prefixo de emoji(s) + separador(es) já existente, mantendo
 *  só o primeiro emoji e o nome limpo. Garante idempotência. */
function stripEmojiPrefix(s: string): { emoji?: string; name: string } {
  let str = (s || "").trim();
  let firstE: string | undefined;
  for (let i = 0; i < 6; i++) {
    const e = firstEmoji(str);
    if (e && str.startsWith(e)) { if (!firstE) firstE = e; str = str.slice(e.length).replace(/^[\s\u2503|\uFF5C·:_-]+/, ""); continue; }
    if (/^[\u2503|\uFF5C·]/.test(str)) { str = str.replace(/^[\s\u2503|\uFF5C·]+/, ""); continue; }
    break;
  }
  return { emoji: firstE, name: str.trim() };
}
export function channelLabel(ch: Ch): string {
  const stripped = stripEmojiPrefix(ch.raw);
  const emoji = (ch.emoji && firstEmoji(ch.emoji)) || stripped.emoji;
  const base = displayChannel(stripped.name, ch.type);
  return emoji ? `${emoji}\u2503${base}` : base;
}
export function categoryLabel(cat: Cat): string {
  const stripped = stripEmojiPrefix(cat.name);
  const emoji = (cat.emoji && firstEmoji(cat.emoji)) || stripped.emoji;
  return emoji ? `${emoji}\u2503 ${stripped.name}` : stripped.name;
}
