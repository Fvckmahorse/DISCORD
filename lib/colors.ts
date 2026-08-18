/* Cores: nome <-> HEX, e nome mais próximo de um HEX. */
const PALETTE: [string, string][] = [
  ["Vermelho", "FF0000"], ["Verde", "00FF00"], ["Azul", "0000FF"], ["Amarelo", "FFFF00"],
  ["Ciano", "00FFFF"], ["Magenta", "FF00FF"], ["Branco", "FFFFFF"], ["Preto", "000000"],
  ["Cinza", "808080"], ["Laranja", "FFA500"], ["Rosa", "FFC0CB"], ["Roxo", "800080"],
  ["Roxo", "5865F2"], ["Dourado", "FFD700"], ["Marrom", "8B4513"], ["Turquesa", "40E0D0"],
  ["Violeta", "8A2BE2"], ["Bordô", "800000"], ["Azul-marinho", "000080"], ["Prata", "C0C0C0"],
  ["Índigo", "4B0082"], ["Coral", "FF7F50"], ["Verde-escuro", "006400"], ["Salmão", "FA8072"],
];
const NAME_TO_HEX: Record<string, string> = {
  vermelho: "FF0000", verde: "00FF00", azul: "0000FF", amarelo: "FFFF00", ciano: "00FFFF",
  magenta: "FF00FF", branco: "FFFFFF", preto: "000000", cinza: "808080", laranja: "FFA500",
  rosa: "FFC0CB", roxo: "800080", dourado: "FFD700", ouro: "FFD700", marrom: "8B4513",
  turquesa: "40E0D0", violeta: "8A2BE2", bordo: "800000", "azul-marinho": "000080", marinho: "000080",
  prata: "C0C0C0", indigo: "4B0082", coral: "FF7F50", salmao: "FA8072", blurple: "5865F2",
  cinzento: "808080", "verde-escuro": "006400", limao: "BFFF00",
};
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function nameToHex(name: string): string | null {
  const n = norm(name);
  if (/^(padrao|default|nenhuma|nenhum|sem cor)$/.test(n)) return null;
  if (/^#?[0-9a-f]{6}$/i.test(n)) return n.replace("#", "").toUpperCase();
  return NAME_TO_HEX[n] ? NAME_TO_HEX[n].toUpperCase() : null;
}
export function nearestName(hex: string): string {
  const h = (hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return hex;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  let best = PALETTE[0][0], bestD = Infinity;
  for (const [name, ph] of PALETTE) {
    const pr = parseInt(ph.slice(0, 2), 16), pg = parseInt(ph.slice(2, 4), 16), pb = parseInt(ph.slice(4, 6), 16);
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}
/** "Cor: Azul (#0000FF)" ou "Cor: Padrão" */
export function colorLine(hex?: string | null): string {
  if (!hex) return "Padrão";
  const H = hex.replace("#", "").toUpperCase();
  return `${nearestName(H)} (#${H})`;
}
