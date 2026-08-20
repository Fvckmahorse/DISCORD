import { kvGet, kvSet, kvReady } from "./kv";
import { bot } from "./botRest";
import { nameToHex } from "./colors";

export type RegOption = { id: string; label: string; emoji?: string; color?: string; roleId?: string };
export type RegCategory = { id: string; name: string; mode: "single" | "multiple"; options: RegOption[] };
export type RegConfig = {
  channelId?: string; messageId?: string;
  title: string; description: string; color: string;
  categories: RegCategory[];
};

const key = (g: string) => `registro:${g}`;
const DEFAULT: RegConfig = {
  title: "📝 REGISTRO",
  description: "Selecione as opções abaixo para personalizar seu perfil.\nVocê pode alterar suas escolhas a qualquer momento.",
  color: "5865F2", categories: [],
};

export async function getRegistro(g: string): Promise<RegConfig | null> {
  if (!kvReady()) return null;
  return kvGet<RegConfig>(key(g));
}
export async function setRegistro(g: string, cfg: RegConfig) { await kvSet(key(g), cfg); }
export function emptyRegistro(): RegConfig { return JSON.parse(JSON.stringify(DEFAULT)); }

/** Monta embed + menus (um select por categoria). */
export function buildPanel(cfg: RegConfig) {
  const color = parseInt((cfg.color || "5865F2").replace("#", ""), 16) || 0x5865f2;
  const cats = cfg.categories.slice(0, 5);
  const components: any[] = [];
  for (const cat of cats) {
    // só opções com rótulo de verdade
    const rawOpts = (cat.options || []).slice(0, 25).filter((o) => (o.label || "").trim());
    if (rawOpts.length === 0) continue; // categoria sem opções não vira menu (evita erro)

    const seen = new Set<string>();
    const opts = rawOpts.map((o, i) => {
      let value = o.id || `opt${i}`;
      while (seen.has(value)) value += "_"; // valores têm que ser únicos
      seen.add(value);
      const em = parseEmoji(o.emoji);
      const opt: any = { label: (o.label || "Opção").trim().slice(0, 100), value: value.slice(0, 100) };
      if (em) opt.emoji = em;
      return opt;
    });

    const placeholder = ((cat.name || "Selecione").trim() + (cat.mode === "multiple" ? " (várias)" : "")).slice(0, 150);
    components.push({
      type: 1,
      components: [{
        type: 3,
        custom_id: `reg:${cat.id}`.slice(0, 100),
        placeholder,
        min_values: 0,
        max_values: cat.mode === "multiple" ? opts.length : 1,
        options: opts,
      }],
    });
  }

  const embed: any = { color };
  const title = (cfg.title || "").trim();
  const desc = (cfg.description || "").trim();
  embed.title = title || "📝 REGISTRO";
  if (desc) embed.description = desc.slice(0, 4000);

  return { embeds: [embed], components };
}

function parseEmoji(e?: string): any | null {
  const s = (e || "").trim();
  if (!s) return null;                                   // vazio -> sem emoji
  const m = s.match(/^<a?:(\w+):(\d+)>$/);               // emoji customizado do servidor
  if (m) return { name: m[1], id: m[2] };
  if (/[^\x00-\x7F]/.test(s)) return { name: s };        // tem caractere não-ASCII (emoji de verdade)
  return null;                                           // texto comum (ex.: "smile") -> ignora, evita Invalid Form Body
}

/** Dado o clique num select, calcula os novos cargos do membro. */
export function applySelection(cat: RegCategory, selectedIds: string[], memberRoles: string[]) {
  const catRoleIds = cat.options.map((o) => o.roleId).filter(Boolean) as string[];
  const selectedRoleIds = cat.options.filter((o) => selectedIds.includes(o.id) && o.roleId).map((o) => o.roleId!) as string[];
  const set = new Set(memberRoles);
  const added: string[] = [], removed: string[] = [];
  // remove os cargos da categoria que não estão selecionados
  for (const rid of catRoleIds) {
    if (!selectedRoleIds.includes(rid) && set.has(rid)) { set.delete(rid); removed.push(rid); }
  }
  // adiciona os selecionados
  for (const rid of selectedRoleIds) {
    if (!set.has(rid)) { set.add(rid); added.push(rid); }
  }
  return { roles: Array.from(set), added, removed };
}

/** Cria no servidor os cargos que ainda não existem (opção com cor/label). Salva os roleId de volta. */
export async function ensureRoles(guildId: string, cfg: RegConfig): Promise<RegConfig> {
  for (const cat of cfg.categories) {
    for (const o of cat.options) {
      if (o.roleId) continue; // já tem cargo escolhido
      const hex = o.color ? o.color.replace("#", "") : (nameToHex(o.label) || "");
      const color = hex ? parseInt(hex, 16) : 0;
      try {
        const r = await bot(`/guilds/${guildId}/roles`, "POST", { name: o.label, color, reason: "zoiudoAI Registro" });
        o.roleId = r.id;
      } catch {}
    }
  }
  return cfg;
}
