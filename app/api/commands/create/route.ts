import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { kvReady } from "@/lib/kv";
import { saveCustom, deleteCustom, listCustom, type CustomCommand } from "@/lib/customCommands";
import { registerGlobal } from "@/lib/registry";
import { FUN_COMMANDS } from "@/lib/funCommands";
import { MOD_COMMANDS } from "@/lib/modCommands";

export const runtime = "nodejs";

async function guard() { const s = await auth(); return s?.user && isOwner(s); }

export async function GET() {
  if (!(await guard())) return Response.json({ error: "restrito" }, { status: 403 });
  if (!kvReady()) return Response.json({ ready: false, commands: [] });
  return Response.json({ ready: true, commands: await listCustom() });
}

export async function POST(req: Request) {
  if (!(await guard())) return Response.json({ ok: false, message: "Apenas o dono." }, { status: 403 });
  if (!kvReady()) return Response.json({ ok: false, message: "Conecte o banco (Upstash Redis) na Vercel primeiro — aba Storage." });

  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!name || name.length > 32) return Response.json({ ok: false, message: "Nome inválido (1–32, só letras/números)." });
  const reserved = new Set([...FUN_COMMANDS.map((c: any) => c.name), ...MOD_COMMANDS.map((c: any) => c.name)]);
  if (reserved.has(name)) return Response.json({ ok: false, message: `"/${name}" já é um comando fixo do bot.` });
  const type = ["percent", "random", "fixed", "action"].includes(b.type) ? b.type : "fixed";
  const cmd: CustomCommand = { name, description: String(b.description || name).slice(0, 100), type, data: String(b.response || ""), permission: b.permission || null };
  await saveCustom(cmd);
  try { const r = await registerGlobal(); return Response.json({ ok: true, message: `✓ /${name} criado e registrado! (${r.count} comandos). Global pode levar até 1h pra aparecer.` }); }
  catch (e: any) { return Response.json({ ok: true, message: `Salvo, mas falha ao registrar agora: ${e?.message}. Use "Sincronizar" depois.` }); }
}

export async function DELETE(req: Request) {
  if (!(await guard())) return Response.json({ ok: false, message: "Apenas o dono." }, { status: 403 });
  const name = new URL(req.url).searchParams.get("name") || "";
  if (!name) return Response.json({ ok: false, message: "Nome ausente." });
  await deleteCustom(name);
  try { await registerGlobal(); } catch {}
  return Response.json({ ok: true, message: `Comando /${name} removido.` });
}
