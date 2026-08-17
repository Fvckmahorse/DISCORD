/* Auto-registro GLOBAL dos slash commands.
   Roda automaticamente depois do build (postbuild). Nunca derruba o build:
   qualquer erro é apenas logado. */
async function main() {
  try {
    const appId = process.env.AUTH_DISCORD_ID;
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!appId || !token) { console.log("[register] AUTH_DISCORD_ID/DISCORD_BOT_TOKEN ausentes — auto-registro pulado."); return; }

    const { FUN_COMMANDS } = await import("../lib/funCommands");
    const { MOD_COMMANDS } = await import("../lib/modCommands");

    const fun = (FUN_COMMANDS as any[]).map((c) => ({
      name: c.name,
      description: (c.description || `Descobre quantos % ${c.adjective} alguém é`).slice(0, 100),
      options: [{ type: 6, name: "alvo", description: "Quem você quer medir?", required: true }],
    }));
    const commands = [...fun, ...(MOD_COMMANDS as any[])];

    const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
      method: "PUT",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    });
    console.log(`[register] status ${res.status} — ${commands.length} comandos enviados (global).`);
  } catch (e: any) {
    console.log("[register] erro (ignorado, build continua):", e?.message || e);
  }
}
main();
