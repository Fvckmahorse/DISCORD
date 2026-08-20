import { auth } from "@/auth";
import { GoogleButton } from "@/components/AuthButtons";

export default async function Home() {
  const session = await auth();
  const logged = !!session?.user;

  return (
    <main className="wrap">
      <div className="mark">
        <div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
        <div>
          <div className="wordmark">zoiudo<span>AI</span></div>
          <div className="eyebrow">bot + construtor de servidor</div>
        </div>
      </div>

      <section className="hero">
        <div className="hero-badge"><span className="dot" /> Powered by IA · feito no Discord</div>
        <h1>Descreva seu servidor.<br /><span className="grad">A IA constrói em segundos.</span></h1>
        <p className="lede">
          Escreva em português como quer o seu servidor — categorias, canais, cargos e permissões —
          e aplique com um clique. Ainda vem com <span className="gold">moderação</span>, comandos
          personalizados, boas-vindas e perfil do bot. Tudo no seu controle.
        </p>

        <div className="card">
          <div className="step-k">{logged ? "você já está logado" : "passo 1 de 2"}</div>
          <div className="row">
            {logged
              ? <a className="btn btn-primary" href="/dashboard">Ir para o painel →</a>
              : <><GoogleButton /><span className="faint">Não pedimos sua senha — só o login seguro do Google.</span></>}
          </div>
        </div>
      </section>

      <div className="feature-grid">
        <div className="feature"><div className="fi">🏗️</div><h3>Construtor com IA</h3><p>Monta categorias, canais e cargos a partir do seu texto.</p></div>
        <div className="feature"><div className="fi">🛡️</div><h3>Moderação</h3><p>Lock, ban, kick, timeout, clear e mais — com permissões.</p></div>
        <div className="feature"><div className="fi">✨</div><h3>Comandos próprios</h3><p>Crie comandos de texto, imagem, porcentagem e ação.</p></div>
        <div className="feature"><div className="fi">👋</div><h3>Boas-vindas</h3><p>Mensagem em embed quando um membro entra, por servidor.</p></div>
      </div>

      <div className="note">
        🔒 Depois do Google, você conecta seu Discord e escolhe onde adicionar o bot. Nada é criado sem a sua confirmação.
      </div>

      <div className="footlinks">
        <a href="/termos">Termos de Serviço</a>
        <a href="/privacidade">Política de Privacidade</a>
      </div>
    </main>
  );
}
