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
  const cats = cfg.categories.slice(0, 5); // Discord: até 5 linhas por mensagem
  const components = cats.map((cat) => {
    const opts = cat.options.slice(0, 25).map((o) => ({
      label: o.label.slice(0, 100),
      value: o.id,
      ...(o.emoji ? { emoji: parseEmoji(o.emoji) } : {}),
    }));
    return {
      type: 1,
      components: [{
        type: 3, // string select
        custom_id: `reg:${cat.id}`,
        placeholder: cat.name + (cat.mode === "multiple" ? " (várias)" : ""),
        min_values: 0,
        max_values: cat.mode === "multiple" ? Math.max(1, opts.length) : 1,
        options: opts.length ? opts : [{ label: "—", value: "none" }],
      }],
    };
  });
  return {
    embeds: [{ title: cfg.title || "📝 REGISTRO", description: cfg.description || "", color }],
    components,
  };
}

function parseEmoji(e: string): any {
  const m = e.match(/^<a?:(\w+):(\d+)>$/); // emoji customizado
  if (m) return { name: m[1], id: m[2] };
  return { name: e };
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
