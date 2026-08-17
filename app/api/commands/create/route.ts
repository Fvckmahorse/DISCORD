import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user || !isOwner(session)) {
    return Response.json({ ok: false, message: "Recurso quase pronto! Falta ligar o login (pra proteger) e um banco de dados grátis (pra guardar seus comandos). Assim que o login voltar, isso é ativado." });
  }
  // Quando o banco estiver conectado, aqui a gente salva o comando e registra global via Discord API.
  return Response.json({ ok: false, message: "Login ok! Falta conectar o banco de dados grátis pra guardar os comandos personalizados — me avise que eu ligo." });
}
