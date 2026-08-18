import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isOwner } from "@/lib/owner";
import { bot } from "@/lib/botRest";
import ProfileForm from "./ProfileForm";
import PresenceForm from "./PresenceForm";

export const metadata = { title: "Perfil do bot — zoiudoAI" };

export default async function Perfil() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const header = (
    <>
      <div className="topbar">
        <div className="mark" style={{ marginBottom: 0 }}>
          <div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
          <div><div className="wordmark">zoiudo<span>AI</span></div><div className="eyebrow">perfil do bot</div></div>
        </div>
        <a className="btn btn-ghost" href="/dashboard">← Painel</a>
      </div>
      <div className="divider" />
    </>
  );

  if (!isOwner(session)) {
    return (<main className="wrap">{header}
      <div className="card"><div className="step-k">acesso restrito</div><h1 style={{ fontSize: 22 }}>Só o dono 🔒</h1></div></main>);
  }

  let initial: any = { username: "", description: "", avatar: null };
  try {
    const me = await bot(`/users/@me`);
    const app = await bot(`/applications/@me`);
    initial = {
      username: me.username, description: app.description || "",
      avatar: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=256` : null,
    };
  } catch {}

  return (
    <main className="wrap">
      {header}
      <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Perfil do bot</h1>
      <p className="lede">Mude o nome, avatar, banner e a descrição — <b>tudo isso muda de verdade no Discord</b>.</p>

      <ProfileForm initial={initial} />

      <div style={{ height: 16 }} />
      <PresenceForm />

      <div className="note" style={{ marginTop: 16 }}>
        ✅ O <b>status</b> acima é aplicado pelo serviço 24/7 (Railway). Se o bot aparecer offline, verifique se o serviço está rodando lá.
      </div>
    </main>
  );
}
