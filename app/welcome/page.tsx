import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { listUserGuilds, canManage } from "@/lib/discord";
import WelcomeManager from "./WelcomeManager";

export const metadata = { title: "Boas-vindas — zoiudoAI" };

export default async function Welcome() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const header = (
    <>
      <div className="topbar">
        <div className="mark" style={{ marginBottom: 0 }}>
          <div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
          <div><div className="wordmark">zoiudo<span>AI</span></div><div className="eyebrow">boas-vindas</div></div>
        </div>
        <a className="btn btn-ghost" href="/dashboard">← Painel</a>
      </div>
      <div className="divider" />
    </>
  );
  if (!isOwner(session)) return (<main className="wrap">{header}<div className="card"><div className="step-k">acesso restrito</div><h1 style={{ fontSize: 22 }}>Só o dono 🔒</h1></div></main>);

  let guilds: { id: string; name: string }[] = [];
  const token = (session as any).discordAccessToken as string | undefined;
  if (token) { try { guilds = (await listUserGuilds(token)).filter(canManage).map(g => ({ id: g.id, name: g.name })); } catch {} }

  return (
    <main className="wrap">
      {header}
      <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Mensagem de boas-vindas</h1>
      <p className="lede">Escolha, por servidor, o canal onde o bot manda um embed quando alguém entra. Sem canal escolhido, ele não envia.</p>
      <WelcomeManager guilds={guilds} />
      <div className="note" style={{ marginTop: 16 }}>
        ℹ️ O <b>envio automático</b> (quando o membro entra) precisa de um pequeno serviço 24/7 — já deixei o site pronto pra ligar isso depois. Por enquanto, use <b>Enviar teste</b> pra ver como fica.
      </div>
    </main>
  );
}
