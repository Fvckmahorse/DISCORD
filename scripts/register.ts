/* Auto-registro GLOBAL (inclui comandos personalizados do banco). Nunca derruba o build. */
async function main() {
  try {
    if (!process.env.AUTH_DISCORD_ID || !process.env.DISCORD_BOT_TOKEN) { console.log("[register] credenciais ausentes — pulado."); return; }
    const { registerGlobal } = await import("../lib/registry");
    const r = await registerGlobal();
    console.log(`[register] status ${r.status} — ${r.count} comandos (global).`);
  } catch (e: any) { console.log("[register] erro (ignorado):", e?.message || e); }
}
main();
