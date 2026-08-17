import nacl from "tweetnacl";
import { FUN_COMMANDS, buildResponse } from "@/lib/funCommands";
import { handleMod } from "@/lib/modHandlers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const raw = await req.text();
  const publicKey = process.env.DISCORD_PUBLIC_KEY || "";

  // 1) Verifica a assinatura do Discord (segurança obrigatória)
  if (!signature || !timestamp || !publicKey) return new Response("bad request", { status: 401 });
  let verified = false;
  try {
    verified = nacl.sign.detached.verify(
      Buffer.from(timestamp + raw),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex"),
    );
  } catch { verified = false; }
  if (!verified) return new Response("invalid signature", { status: 401 });

  const body = JSON.parse(raw);

  // 2) PING de verificação -> PONG
  if (body.type === 1) return Response.json({ type: 1 });

  // 3) Comando de barra
  if (body.type === 2) {
    // 3a) comandos de moderação/membros/info (retorna null se não for um deles)
    const mod = await handleMod(body);
    if (mod) return Response.json(mod);

    // 3b) comandos divertidos
    const name = body.data?.name;
    const cmd = FUN_COMMANDS.find((c) => c.name === name);
    if (!cmd) return Response.json({ type: 4, data: { content: "Comando desconhecido." } });

    const opt = (body.data?.options || []).find((o: any) => o.name === "alvo");
    const targetId = opt?.value || body.member?.user?.id || body.user?.id;
    const mention = `<@${targetId}>`;
    return Response.json({
      type: 4,
      data: {
        content: buildResponse(cmd, mention),
        allowed_mentions: { users: targetId ? [String(targetId)] : [] },
      },
    });
  }

  return new Response("unhandled", { status: 400 });
}
