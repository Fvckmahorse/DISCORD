import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { MOD_COMMANDS } from "@/lib/modCommands";
import { FUN_COMMANDS } from "@/lib/funCommands";
import CommandCreator from "./CommandCreator";

export const metadata = { title: "Comandos — zoiudoAI" };

const PERM_LABEL: Record<string, string> = {
  "16": "Gerenciar Canais", "8192": "Gerenciar Mensagens", "2": "Expulsar", "4": "Banir",
  "1099511627776": "Moderar Membros", "134217728": "Gerenciar Apelidos", "268435456": "Gerenciar Cargos",
};
const def = (name: string) => MOD_COMMANDS.find((c: any) => c.name === name);

type Cat = { title: string; emoji: string; color: string; desc: string; names: string[] };
const CATS: Cat[] = [
  { title: "Moderação / Canais", emoji: "🔒", color: "#f0616d", desc: "Controle os canais: trancar, esconder, limpar e organizar.", names: ["lock","unlock","slowmode","clear","purge","hide","unhide","rename","topic","lockdown","unlockdown"] },
  { title: "Membros", emoji: "👤", color: "#e3a54a", desc: "Modere membros com hierarquia e permissões respeitadas.", names: ["kick","ban","unban","timeout","untimeout","nick","role"] },
  { title: "Informações", emoji: "📋", color: "#5865f2", desc: "Consulte dados do servidor, membros e canais.", names: ["serverinfo","userinfo","avatar","roles","channelinfo","botinfo","cmds"] },
];

function Entry({ name, desc, meta }: { name: string; desc: string; meta: string[] }) {
  return (
    <div className="cmd-entry">
      <div className="command-entry-label"><span className="cmd-pill">/{name}</span></div>
      <div className="cmd-desc">{desc}</div>
      {meta.length > 0 && <div className="cmd-meta">{meta.map((m, i) => <span key={i} className="tagp">{m}</span>)}</div>}
    </div>
  );
}

export default async function Comandos() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const header = (
    <>
      <div className="topbar">
        <div className="mark" style={{ marginBottom: 0 }}>
          <div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
          <div><div className="wordmark">zoiudo<span>AI</span></div><div className="eyebrow">comandos</div></div>
        </div>
        <a className="btn btn-ghost" href="/dashboard">← Painel</a>
      </div>
      <div className="divider" />
    </>
  );

  if (!isOwner(session)) {
    return (<main className="wrap">{header}
      <div className="card"><div className="step-k">acesso restrito</div>
        <h1 style={{ fontSize: 22, marginTop: 4 }}>Essa área é só do dono 🔒</h1>
        <p className="lede">Somente o administrador do zoiudoAI pode ver e gerenciar os comandos do bot.</p>
      </div></main>);
  }

  return (
    <main className="wrap">
      {header}
      <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Comandos do zoiudoAI</h1>
      <p className="lede" style={{ marginBottom: 8 }}>Todos os slash commands do seu bot, por categoria. Use no Discord digitando <code style={{ fontFamily: "var(--mono)" }}>/</code>.</p>

      <CommandCreator />

      {/* Diversão */}
      <div className="cmd-category" style={{ ["--cat" as any]: "#f1c40f" }}>
        <div className="cmd-category-header">
          <span className="cat-emoji">🎲</span>
          <div><h2>Diversão</h2><p>Comandos de zoeira com porcentagem aleatória.</p></div>
          <span className="count">{FUN_COMMANDS.length}</span>
        </div>
        <div className="cmd-list">
          {FUN_COMMANDS.map((c: any) => (
            <Entry key={c.name} name={c.name} desc={`Descobre quantos % ${c.adjective} alguém é.`} meta={["alvo: @usuário"]} />
          ))}
        </div>
      </div>

      {/* Moderação / Membros / Info */}
      {CATS.map((cat) => (
        <div className="cmd-category" key={cat.title} style={{ ["--cat" as any]: cat.color }}>
          <div className="cmd-category-header">
            <span className="cat-emoji">{cat.emoji}</span>
            <div><h2>{cat.title}</h2><p>{cat.desc}</p></div>
            <span className="count">{cat.names.length}</span>
          </div>
          <div className="cmd-list">
            {cat.names.map((n) => {
              const d = def(n);
              const meta: string[] = [];
              const perm = d?.default_member_permissions;
              meta.push(perm ? `Permissão: ${PERM_LABEL[perm] || "especial"}` : "Todos podem");
              (d?.options || []).forEach((o: any) => meta.push(`${o.name}${o.required ? "*" : ""}`));
              return <Entry key={n} name={n} desc={d?.description || ""} meta={meta} />;
            })}
          </div>
        </div>
      ))}

      <div className="note" style={{ marginTop: 18 }}>
        Os comandos se registram <b>automaticamente</b> a cada deploy — não precisa registrar manualmente. Comandos globais podem levar até 1h pra aparecer pra todos.
      </div>
    </main>
  );
}
