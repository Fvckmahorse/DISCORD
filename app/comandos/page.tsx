import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FUN_COMMANDS } from "@/lib/funCommands";
import RegisterButtons from "./RegisterButtons";

export const metadata = { title: "Comandos — zoiudoAI" };

export default async function Comandos() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="mark" style={{ marginBottom: 0 }}>
          <div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
          <div><div className="wordmark">zoiudo<span>AI</span></div><div className="eyebrow">comandos</div></div>
        </div>
        <a className="btn btn-ghost" href="/dashboard">← Painel</a>
      </div>
      <div className="divider" />

      <div className="card">
        <div className="step-k">comandos divertidos</div>
        <h1 style={{ fontSize: 22, marginTop: 4 }}>Slash commands do seu bot</h1>
        <p className="lede">Use no Discord assim: <code style={{fontFamily:"var(--mono)"}}>/guloso alvo:@alguém</code> → o bot responde com uma porcentagem aleatória.</p>

        <div className="roles">
          {FUN_COMMANDS.map((c) => (
            <div className="role" key={c.name}>
              <span className="rn" style={{ fontFamily: "var(--mono)" }}>/{c.name}</span>
              <span className="perms"><span className="perm">alguém é X% {c.adjective}</span></span>
            </div>
          ))}
        </div>

        <RegisterButtons />
      </div>

      <div className="note">
        Pra adicionar/editar comandos: por enquanto eles ficam no arquivo <code>lib/funCommands.ts</code>. Me peça e eu adiciono os que você quiser — depois é só clicar em “Registrar” aqui.
      </div>
    </main>
  );
}
