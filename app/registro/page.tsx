import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { listUserGuilds, canManage } from "@/lib/discord";
import RegistroManager from "./RegistroManager";

export const metadata = { title: "Registro — zoiudoAI" };

export default async function Registro() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const header = (
    <>
      <div className="topbar">
        <div className="mark" style={{ marginBottom: 0 }}>
          <div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
          <div><div className="wordmark">zoiudo<span>AI</span></div><div className="eyebrow">registro</div></div>
        </div>
        <a className="btn btn-ghost" href="/dashboard">← Painel</a>
      </div>
      <div className="divider" />
    </>
  );
  if (!isOwner(session)) return (<main className="wrap">{header}<div className="card"><div className="step-k">acesso restrito</div><h1 style={{ fontSize: 22 }}>Só o dono 🔒</h1></div></main>);

  let guilds: { id: string; name: string }[] = [];
  const token = (session as any).discordAccessToken as string | undefined;
  if (token) { try { guilds = (await listUserGuilds(token)).filter(canManage).map((g) => ({ id: g.id, name: g.name })); } catch {} }

  return (
    <main className="wrap">
      {header}
      <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Sistema de Registro</h1>
      <p className="lede">Crie um painel com menus onde os membros escolhem opções (gênero, idade, jogos…) e recebem os cargos automaticamente. Cada categoria pode ser de escolha única ou múltipla.</p>
      <RegistroManager guilds={guilds} />
      <div className="note" style={{ marginTop: 16 }}>
        ⚙️ O bot precisa de <b>Gerenciar Cargos</b> e o cargo dele deve estar <b>acima</b> dos cargos do registro. Categorias “criar cargo novo” usam o nome e a cor da opção.
      </div>
    </main>
  );
}
