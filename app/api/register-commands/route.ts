import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { FUN_COMMANDS } from "@/lib/funCommands";
import { MOD_COMMANDS } from "@/lib/modCommands";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Faça login no site primeiro." }, { status: 401 });
  if (!isOwner(session)) return Response.json({ error: "Apenas o dono pode registrar comandos." }, { status: 403 });

  const appId = process.env.AUTH_DISCORD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!appId || !botToken) return Response.json({ error: "Faltam AUTH_DISCORD_ID ou DISCORD_BOT_TOKEN na Vercel." }, { status: 500 });

  const guild = new URL(req.url).searchParams.get("guild");
  const endpoint = guild
    ? `https://discord.com/api/v10/applications/${appId}/guilds/${guild}/commands`
    : `https://discord.com/api/v10/applications/${appId}/commands`;

  const funCommands = FUN_COMMANDS.map((c) => ({
    name: c.name,
    description: (c.description || `Descobre quantos % ${c.adjective} alguém é`).slice(0, 100),
    options: [{ type: 6, name: "alvo", description: "Quem você quer medir?", required: true }],
  }));
  const commands = [...funCommands, ...MOD_COMMANDS];

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  const data = await res.json().catch(() => ({}));
  return Response.json({
    ok: res.ok, status: res.status,
    registered: Array.isArray(data) ? data.length : 0,
    scope: guild ? `servidor ${guild} (instantâneo)` : "global (pode levar até 1h pra aparecer)",
    data,
  });
}
