export const metadata = { title: "Termos de Serviço — zoiudoAI" };

export default function Termos() {
  return (
    <main className="wrap legal">
      <div className="mark"><div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
        <div><div className="wordmark">zoiudo<span>AI</span></div><div className="eyebrow">termos de serviço</div></div></div>

      <h1>Termos de Serviço</h1>
      <div className="upd">Última atualização: 17 de agosto de 2026</div>

      <p>Bem-vindo ao <b>zoiudoAI</b> ("o Serviço"). Ao usar o Serviço, você concorda com estes Termos. Se não concordar, não utilize o Serviço.</p>

      <h2>1. O que o Serviço faz</h2>
      <p>O zoiudoAI permite que você descreva, em texto, a estrutura de um servidor do Discord (categorias, canais, cargos e permissões). O Serviço interpreta a descrição, mostra uma prévia e, <b>somente após a sua confirmação</b>, cria essa estrutura no servidor escolhido por meio de um bot oficial do Discord.</p>

      <h2>2. Requisitos e contas</h2>
      <ul>
        <li>Você precisa de uma conta Google (para login) e de uma conta Discord (para conectar e adicionar o bot).</li>
        <li>Você é responsável por manter suas contas seguras.</li>
        <li>O bot só age em servidores nos quais você tem permissão de gerenciamento e nos quais o bot foi adicionado por você.</li>
      </ul>

      <h2>3. Uso aceitável</h2>
      <p>Você concorda em não usar o Serviço para: praticar atividades ilegais; criar conteúdo que viole os <a href="https://discord.com/terms" target="_blank" rel="noreferrer">Termos do Discord</a>; enviar spam ou abusar das APIs; ou tentar burlar limites e mecanismos de segurança da plataforma.</p>

      <h2>4. Ações realizadas no seu Discord</h2>
      <p>As alterações no seu servidor (criação de canais, cargos e permissões) são feitas <b>a seu pedido e com a sua confirmação</b>. Você é o único responsável pelo resultado dessas alterações no seu servidor. Recomendamos revisar a prévia antes de aplicar.</p>

      <h2>5. Disponibilidade e "no estado em que se encontra"</h2>
      <p>O Serviço é oferecido "no estado em que se encontra", sem garantias de disponibilidade contínua ou de ausência de erros. Podemos alterar, suspender ou encerrar o Serviço a qualquer momento.</p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>Na máxima extensão permitida por lei, o Serviço não se responsabiliza por danos indiretos, perda de dados ou prejuízos decorrentes do uso — incluindo alterações feitas no seu servidor do Discord por meio do Serviço.</p>

      <h2>7. Alterações nestes Termos</h2>
      <p>Estes Termos podem ser atualizados. A versão vigente estará sempre nesta página, com a data de atualização acima.</p>

      <h2>8. Contato</h2>
      <div className="box">
        <p style={{margin:0}}>Dúvidas sobre estes Termos? Fale com a gente: <a href="mailto:psrcamv@gmail.com">psrcamv@gmail.com</a></p>
      </div>

      <div className="footlinks">
        <a href="/">← Início</a>
        <a href="/privacidade">Política de Privacidade</a>
      </div>
    </main>
  );
}
