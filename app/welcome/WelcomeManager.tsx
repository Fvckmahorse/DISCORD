"use client";
import { useState } from "react";

export default function WelcomeManager({ guilds }: { guilds: { id: string; name: string }[] }) {
  const [guildId, setGuildId] = useState("");
  const [guildName, setGuildName] = useState("");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("Bem-vindo(a)! 🎉");
  const [message, setMessage] = useState("Olá {membro}, seja bem-vindo(a) a **{servidor}**! 🥳\nCapriche na apresentação e aproveite!");
  const [color, setColor] = useState("7C6CFF");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  async function pickGuild(id: string) {
    setGuildId(id); setMsg(null); setChannels([]); setChannelId("");
    const g = guilds.find(x => x.id === id); setGuildName(g?.name || "");
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/welcome?guild=${id}`); const d = await r.json();
      if (d.error) { setMsg("⚠️ " + d.error); }
      else {
        setChannels(d.channels || []);
        if (d.config) { setChannelId(d.config.channelId || ""); setTitle(d.config.title || title); setMessage(d.config.message || message); setColor(d.config.color || color); }
      }
    } catch (e: any) { setMsg("❌ " + e.message); }
    finally { setLoading(false); }
  }

  async function save(action?: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/welcome", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, guildName, channelId, title, message, color, action }) });
      const d = await r.json();
      setMsg((d.ok ? "✓ " : "⚠️ ") + d.message);
    } catch (e: any) { setMsg("❌ " + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="creator" style={{ marginTop: 0 }}>
        <label>Servidor</label>
        <select value={guildId} onChange={e => pickGuild(e.target.value)}>
          <option value="">— escolha um servidor —</option>
          {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        {guildId && (
          <>
            <label>Canal das boas-vindas {loading && "(carregando…)"}</label>
            <select value={channelId} onChange={e => setChannelId(e.target.value)}>
              <option value="">— nenhum (desativado, não envia) —</option>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
            <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>Sem canal escolhido = o bot NÃO envia boas-vindas nesse servidor.</div>

            <label>Título do embed</label>
            <input value={title} onChange={e => setTitle(e.target.value)} />

            <label>Mensagem (use {"{membro}"} pra marcar, {"{servidor}"} pro nome)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} style={{ minHeight: 90 }} />

            <label>Cor da barra (HEX)</label>
            <input value={color} onChange={e => setColor(e.target.value.replace("#", ""))} placeholder="7C6CFF" />

            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-primary" onClick={() => save()} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
              <button className="btn btn-ghost" onClick={() => save("test")} disabled={busy || !channelId}>Enviar teste</button>
            </div>
            {msg && <div className="note" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{msg}</div>}
          </>
        )}
      </div>
    </div>
  );
}
