import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { registerGlobal, allCommandDefs } from "@/lib/registry";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Faça login primeiro." }, { status: 401 });
  if (!isOwner(session)) return Response.json({ error: "Apenas o dono." }, { status: 403 });

  const appId = process.env.AUTH_DISCORD_ID, botToken = process.env.DISCORD_BOT_TOKEN;
  if (!appId || !botToken) return Response.json({ error: "Faltam AUTH_DISCORD_ID/DISCORD_BOT_TOKEN." }, { status: 500 });

  const url = new URL(req.url);
  const clear = url.searchParams.get("clear");
  if (clear) {
    const res = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${clear}/commands`, {
      method: "PUT", headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" }, body: "[]",
    });
    return Response.json({ ok: res.ok, message: res.ok ? "✓ Comandos DESTE servidor removidos (duplicados). Ficam só os globais." : `Falha (${res.status}).` });
  }

  const guild = url.searchParams.get("guild");
  const defs = await allCommandDefs();
  const endpoint = guild
    ? `https://discord.com/api/v10/applications/${appId}/guilds/${guild}/commands`
    : `https://discord.com/api/v10/applications/${appId}/commands`;
  const res = await fetch(endpoint, { method: "PUT", headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" }, body: JSON.stringify(defs) });
  return Response.json({ ok: res.ok, status: res.status, registered: defs.length, scope: guild ? `servidor ${guild} (instantâneo)` : "global (até 1h)" });
}
