import nacl from "tweetnacl";
import { FUN_COMMANDS, buildResponse } from "@/lib/funCommands";
import { handleMod } from "@/lib/modHandlers";
import { getCustom, buildCustomInteraction } from "@/lib/customCommands";

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
    if (!cmd) {
      // 3c) comandos personalizados (banco)
      const custom = await getCustom(name);
      if (custom) {
        // imagem anexada (data URI) -> envia como arquivo (multipart)
        if (custom.type === "image" && custom.image && custom.image.startsWith("data:")) {
          const m = custom.image.match(/^data:(.+?);base64,(.*)$/);
          if (m) {
            const mime = m[1], bytes = Buffer.from(m[2], "base64");
            const ext = (mime.split("/")[1] || "png").replace("+xml", "");
            const caller = body.member?.user?.id || body.user?.id;
            const text = (custom.data || "").replace(/\{user\}/g, `<@${caller}>`);
            const payload = { type: 4, data: { content: text || undefined, attachments: [{ id: 0, filename: `img.${ext}` }], allowed_mentions: { parse: ["users"] } } };
            const fd = new FormData();
            fd.append("payload_json", JSON.stringify(payload));
            fd.append("files[0]", new Blob([bytes], { type: mime }), `img.${ext}`);
            return new Response(fd);
          }
        }
        return Response.json({ type: 4, data: buildCustomInteraction(custom, body) });
      }
      return Response.json({ type: 4, data: { content: "Comando desconhecido." } });
    }

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
