import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUserGuilds, canManage } from "@/lib/discord";
import { applyConfig } from "@/lib/apply";
import type { Config } from "@/lib/interpret";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  let totalCh = 0;
  for (const c of config.categories) totalCh += c.channels.length;
  if (totalCh > 500) return NextResponse.json({ error: "Passou de 500 canais (limite do Discord)." }, { status: 400 });

  // Resposta em streaming: manda o progresso conforme cria, e no fim o resultado + tempo.
  const encoder = new TextEncoder();
  const start = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await applyConfig(guildId, config, botToken, (done, total, message) => {
          send({ type: "progress", done, total, message });
        });
        send({ type: "done", ...result, ms: Date.now() - start });
      } catch (e: any) {
        send({ type: "error", error: e?.message ?? "Falha ao aplicar.", ms: Date.now() - start });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
}
