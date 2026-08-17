import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";

export const runtime = "nodejs";
const API = "https://discord.com/api/v10";
const H = () => ({ Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" });

export async function GET() {
  const session = await auth();
  if (!session?.user || !isOwner(session)) return Response.json({ error: "restrito" }, { status: 403 });
  try {
    const me = await (await fetch(`${API}/users/@me`, { headers: H() })).json();
    const app = await (await fetch(`${API}/applications/@me`, { headers: H() })).json();
    return Response.json({
      id: me.id, username: me.username, global_name: me.global_name,
      avatar: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=256` : null,
      description: app.description || "",
    });
  } catch (e: any) { return Response.json({ error: e?.message || "erro" }, { status: 500 }); }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !isOwner(session)) return Response.json({ ok: false, message: "Apenas o dono." }, { status: 403 });
  const { username, description, avatar, banner } = await req.json().catch(() => ({}));

  const log: string[] = [];
  // nome/avatar/banner -> PATCH /users/@me
  const userBody: any = {};
  if (username && username.trim()) userBody.username = username.trim();
  if (avatar) userBody.avatar = avatar;   // data URI base64
  if (banner) userBody.banner = banner;
  if (Object.keys(userBody).length) {
    const r = await fetch(`${API}/users/@me`, { method: "PATCH", headers: H(), body: JSON.stringify(userBody) });
    if (r.ok) log.push("✓ Nome/avatar/banner atualizados.");
    else { const t = await r.text(); log.push(`⚠️ Perfil: ${r.status} ${t.slice(0, 120)}${r.status === 429 ? " (nome só pode mudar 2x/hora)" : ""}`); }
  }
  // descrição ("Sobre mim") -> PATCH /applications/@me
  if (typeof description === "string") {
    const r = await fetch(`${API}/applications/@me`, { method: "PATCH", headers: H(), body: JSON.stringify({ description }) });
    if (r.ok) log.push("✓ Descrição (Sobre mim) atualizada.");
    else log.push(`⚠️ Descrição: ${r.status}`);
  }
  return Response.json({ ok: true, message: log.join("\n") || "Nada para alterar." });
}
