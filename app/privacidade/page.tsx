export const metadata = { title: "Política de Privacidade — zoiudoAI" };

export default function Privacidade() {
  return (
    <main className="wrap legal">
      <div className="mark"><div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
        <div><div className="wordmark">zoiudo<span>AI</span></div><div className="eyebrow">política de privacidade</div></div></div>

      <h1>Política de Privacidade</h1>
      <div className="upd">Última atualização: 17 de agosto de 2026</div>

      <p>Esta política explica quais dados o <b>zoiudoAI</b> ("o Serviço") acessa e como eles são usados. Prezamos por coletar o mínimo necessário para o Serviço funcionar.</p>

      <h2>1. Dados que acessamos</h2>
      <ul>
        <li><b>Login com Google:</b> seu nome, e-mail e foto de perfil — apenas para identificar você e manter a sessão.</li>
        <li><b>Conexão com Discord (escopo <code>identify</code>):</b> seu ID, nome de usuário e avatar do Discord.</li>
        <li><b>Servidores do Discord (escopo <code>guilds</code>):</b> a lista dos seus servidores e suas permissões neles, para mostrar onde você pode construir.</li>
      </ul>
      <p>Não pedimos e não armazenamos a sua senha do Google nem do Discord. Não solicitamos o seu token do Discord.</p>

      <h2>2. Como usamos os dados</h2>
      <ul>
        <li>Autenticar você e manter sua sessão.</li>
        <li>Listar os servidores onde você pode configurar.</li>
        <li>Criar a estrutura (canais, cargos, permissões) no servidor <b>quando você pede e confirma</b>.</li>
      </ul>

      <h2>3. Armazenamento e segurança</h2>
      <ul>
        <li>Os tokens de acesso (OAuth) são mantidos apenas na sua sessão, de forma temporária, para operar o Serviço enquanto você está logado.</li>
        <li>As credenciais sensíveis do aplicativo (segredos e o token do bot) ficam somente no servidor (backend), nunca no navegador.</li>
        <li>Usamos os canais oficiais de OAuth2 do Google e do Discord.</li>
      </ul>

      <h2>4. Compartilhamento</h2>
      <p>Não vendemos os seus dados. Compartilhamos informações apenas com o Google e o Discord na medida necessária para autenticar você e executar as ações que você solicitar — conforme as políticas dessas plataformas.</p>

      <h2>5. Retenção</h2>
      <p>Os dados de sessão são temporários e deixam de ser usados quando você sai ou a sessão expira. Se guardarmos histórico de projetos que você criar, ele fica associado à sua conta e pode ser removido a seu pedido.</p>

      <h2>6. Seus direitos</h2>
      <ul>
        <li>Você pode revogar o acesso do zoiudoAI a qualquer momento nas configurações da sua conta Google e Discord.</li>
        <li>Você pode remover o bot do seu servidor a qualquer momento.</li>
        <li>Para solicitar remoção de dados, use o contato abaixo.</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>Usamos apenas um cookie de sessão, necessário para manter você autenticado. Não usamos cookies de publicidade.</p>

      <h2>8. Alterações</h2>
      <p>Esta política pode ser atualizada. A versão vigente estará sempre nesta página, com a data acima.</p>

      <h2>9. Contato</h2>
      <div className="box">
        <p style={{margin:0}}>Dúvidas ou pedidos sobre seus dados: <a href="mailto:psrcamv@gmail.com">psrcamv@gmail.com</a></p>
      </div>

      <div className="footlinks">
        <a href="/">← Início</a>
        <a href="/termos">Termos de Serviço</a>
      </div>
    </main>
  );
}
