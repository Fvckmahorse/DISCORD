import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DiscordButton, SignOutButton } from "@/components/AuthButtons";
import { listUserGuilds, canManage, iconUrl, addBotUrl, botInGuild, type Guild } from "@/lib/discord";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const discordConnected = (session as any).discordConnected as boolean;
  const token = (session as any).discordAccessToken as string | undefined;

  let guilds: Guild[] = [];
  let error: string | null = null;
  let botIn: Record<string, boolean> = {};
  if (discordConnected && token) {
    try {
      guilds = (await listUserGuilds(token)).filter(canManage);
      // checa em quais desses o bot já está (em paralelo)
      const checks = await Promise.all(guilds.map((g) => botInGuild(g.id)));
      guilds.forEach((g, i) => { botIn[g.id] = checks[i]; });
    }
    catch (e: any) {
      error = e?.message === "DISCORD_TOKEN_EXPIRED"
        ? "Sua conexão com o Discord expirou. Conecte novamente."
        : "Não consegui carregar seus servidores agora. Tente de novo em instantes.";
    }
  }

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="mark" style={{ marginBottom: 0 }}>
          <div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
          <div><div className="wordmark">zoiudo<span>AI</span></div><div className="eyebrow">painel</div></div>
        </div>
        <div className="row">
          <a className="btn btn-ghost" href="/comandos">Comandos</a>
          <a className="btn btn-ghost" href="/registro">Registro</a>
          <a className="btn btn-ghost" href="/perfil">Perfil</a>
          <a className="btn btn-ghost" href="/welcome">Boas-vindas</a>
          <span className="pill">olá, {session.user.name?.split(" ")[0] ?? "você"}</span>
          <SignOutButton />
        </div>
      </div>
      <div className="divider" />

      {!discordConnected ? (
        <div className="card">
          <div className="step-k">passo 2 de 2</div>
          <h1 style={{ fontSize: 22 }}>Conecte seu Discord para começar</h1>
          <p className="lede">Vamos só ver quem você é e listar os servidores onde você pode configurar.</p>
          <DiscordButton />
        </div>
      ) : (
        <>
          <div className="card">
            <div className="step-k">seus servidores</div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h1 style={{ fontSize: 22, margin: 0 }}>Onde você pode construir</h1>
              <a className="btn btn-ghost" href={addBotUrl()} target="_blank" rel="noopener noreferrer">+ Adicionar o bot em outro</a>
            </div>

            {error && <div className="note" style={{ marginTop: 14 }}>⚠️ {error} <DiscordButton label="Reconectar Discord" /></div>}
            {!error && guilds.length === 0 && (
              <div className="note" style={{ marginTop: 14 }}>Você não tem servidores onde possa gerenciar. Crie um no Discord (botão “+”) e volte aqui.</div>
            )}

            <div className="guilds">
              {guilds.map((g) => (
                <div className="guild" key={g.id}>
                  <div className="ic">{iconUrl(g) ? <img src={iconUrl(g)!} alt="" /> : (g.name?.[0] ?? "?").toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="gn">{g.name}</div>
                    <div className="role">{botIn[g.id] ? (g.owner ? "você é dono · bot ativo" : "você gerencia · bot ativo") : "bot ainda não adicionado"}</div>
                  </div>
                  <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
                    {botIn[g.id] ? (
                      <a className="btn btn-primary add" href={`/build?guild=${g.id}&name=${encodeURIComponent(g.name)}`}>Construir →</a>
                    ) : (
                      <a className="btn btn-primary add" href={addBotUrl(g.id)} target="_blank" rel="noopener noreferrer">+ Add bot</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {guilds.some((g) => !botIn[g.id]) && (
              <div className="faint" style={{ fontSize: 12, marginTop: 12 }}>
                Depois de adicionar o bot na aba que abriu, volte aqui e <a href="/dashboard" style={{ color: "var(--accent)" }}>atualize a página</a> — o botão “Construir” vai aparecer.
              </div>
            )}
          </div>

          <div className="note">
            Dica: nos servidores sem o bot, aparece só o <b>“+ Add bot”</b> (abre numa aba nova). Depois de adicionar, volte e atualize — aí surge o <b>“Construir”</b>.
          </div>
        </>
      )}
    </main>
  );
}
