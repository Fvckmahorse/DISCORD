/* Comandos divertidos do zoiudoAI (slash commands).
   Pra adicionar um novo, é só incluir aqui { name, adjective } e registrar de novo.
   Regras do Discord: name em minúsculas, sem espaços, 1–32 caracteres. */
export type FunCommand = { name: string; adjective: string; description?: string };

export const FUN_COMMANDS: FunCommand[] = [
  { name: "guloso", adjective: "guloso(a)" },
  { name: "gay",    adjective: "gay" },
  { name: "burro",  adjective: "burro(a)" },
  { name: "gato",   adjective: "gato(a)" },
  { name: "fofo",   adjective: "fofo(a)" },
  { name: "corno",  adjective: "corno(a)" },
];

/** Monta a resposta com uma porcentagem aleatória (diferente a cada uso). */
export function buildResponse(cmd: FunCommand, mention: string): string {
  const percent = Math.floor(Math.random() * 101);
  return `${mention} é **${percent}%** ${cmd.adjective} 📊`;
}
