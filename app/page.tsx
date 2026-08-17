import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GoogleButton } from "@/components/AuthButtons";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="wrap">
      <div className="mark">
        <div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
        <div>
          <div className="wordmark">zoiudo<span>AI</span></div>
          <div className="eyebrow">construtor de servidor</div>
        </div>
      </div>

      <h1>Descreva seu servidor. A IA constrói.</h1>
      <p className="lede">
        Escreva em português como quer o seu servidor do Discord — categorias, canais,
        cargos e permissões — e aplique com um clique. Comece entrando com o Google.
      </p>

      <div className="card">
        <div className="step-k">passo 1 de 2</div>
        <div className="row">
          <GoogleButton />
          <span className="faint">Não pedimos sua senha — só o login seguro do Google.</span>
        </div>
      </div>

      <div className="note">
        🔒 Depois do Google, você conecta seu Discord e escolhe onde adicionar o bot.
        Nada é criado sem a sua confirmação.
      </div>
    </main>
  );
}
