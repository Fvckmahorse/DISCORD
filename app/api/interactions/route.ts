import nacl from "tweetnacl";
import { FUN_COMMANDS, buildResponse } from "@/lib/funCommands";
import { handleMod } from "@/lib/modHandlers";
import { getCustom, buildCustomInteraction } from "@/lib/customCommands";
import { getRegistro, applySelection } from "@/lib/registro";
import { bot } from "@/lib/botRest";

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

  // 4) Interação de componente (menus do Registro)
  if (body.type === 3) {
    const customId: string = body.data?.custom_id || "";
    if (customId.startsWith("reg:")) {
      const catId = customId.slice(4);
      const guildId = body.guild_id;
      const cfg = await getRegistro(guildId);
      const cat = cfg?.categories.find((c) => c.id === catId);
      if (!cfg || !cat) return Response.json({ type: 4, data: { content: "Registro indisponível.", flags: 64 } });

      const selected: string[] = body.data?.values || [];
      const memberRoles: string[] = body.member?.roles || [];
      const { roles, added, removed } = applySelection(cat, selected, memberRoles);

      try {
        await bot(`/guilds/${guildId}/members/${body.member.user.id}`, "PATCH", { roles });
      } catch (e: any) {
        return Response.json({ type: 4, data: { content: "❌ Não consegui alterar seus cargos. O bot precisa de **Gerenciar Cargos** e estar acima desses cargos.", flags: 64 } });
      }

      const parts: string[] = [];
      if (added.length) parts.push("➕ " + added.map((r) => `<@&${r}>`).join(" "));
      if (removed.length) parts.push("➖ " + removed.map((r) => `<@&${r}>`).join(" "));
      const msg = parts.length ? parts.join("\n") : "Nada mudou.";
      return Response.json({ type: 4, data: { content: `✅ **Registro atualizado!**\n${msg}`, flags: 64, allowed_mentions: { parse: [] } } });
    }
    return Response.json({ type: 4, data: { content: "Interação desconhecida.", flags: 64 } });
  }

  return new Response("unhandled", { status: 400 });
}
