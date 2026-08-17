import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUserGuilds, canManage } from "@/lib/discord";
import { applyConfig } from "@/lib/apply";
import type { Config } from "@/lib/interpret";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const token = (session as any).discordAccessToken as string | undefined;
  if (!token) return NextResponse.json({ error: "Discord não conectado." }, { status: 401 });

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ error: "Bot não configurado no servidor." }, { status: 500 });

  const body = await req.json().catch(() => null);
  const guildId = body?.guildId as string;
  const config = body?.config as Config;
  if (!guildId || !config) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  // Segurança: o usuário precisa poder gerenciar ESSE servidor.
  try {
    const guilds = await listUserGuilds(token);
    const g = guilds.find((x) => x.id === guildId);
    if (!g || !canManage(g)) return NextResponse.json({ error: "Você não gerencia esse servidor." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Não consegui verificar suas permissões no Discord." }, { status: 502 });
  }

  // Trava servidor: limites do Discord
  let total = 0;
  for (const c of config.categories) total += c.channels.length;
  if (total > 500) return NextResponse.json({ error: "Passou de 500 canais (limite do Discord)." }, { status: 400 });

  try {
    const result = await applyConfig(guildId, config, botToken);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Falha ao aplicar." }, { status: 500 });
  }
}
