"use client";
import { useState } from "react";

export default function CommandCreator() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("percent");
  const [resp, setResp] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guild, setGuild] = useState("");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);

  async function sync(clear: boolean) {
    setAdminBusy(true); setAdminMsg(null);
    try {
      const q = clear ? `?clear=${encodeURIComponent(guild.trim())}` : "";
      const res = await fetch(`/api/register-commands${q}`);
      const data = await res.json();
      setAdminMsg(data.message || (data.ok ? `✓ ${data.registered} comandos sincronizados (${data.scope}).` : `⚠️ ${data.error || "erro"}`));
    } catch (e: any) { setAdminMsg("❌ " + (e?.message || "erro")); }
    finally { setAdminBusy(false); }
  }

  async function create() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/commands/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim().toLowerCase(), description: desc.trim(), type, response: resp.trim() }),
      });
      const data = await res.json();
      setMsg((data.ok ? "✓ " : "⚠️ ") + data.message);
    } catch (e: any) { setMsg("❌ " + (e?.message || "erro")); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="creator" style={{ marginTop: 0, marginBottom: 12 }}>
        <div className="step-k">registro & duplicados</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Os comandos já se registram sozinhos a cada deploy. Use os botões abaixo só se precisar forçar, ou pra tirar duplicatas.</p>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn btn-ghost" disabled={adminBusy} onClick={() => sync(false)}>🔄 Sincronizar (global)</button>
        </div>
        <label style={{ marginTop: 12 }}>Remover duplicados de um servidor (cole o ID)</label>
        <div className="row">
          <input value={guild} onChange={e => setGuild(e.target.value)} placeholder="ID do servidor" style={{ flex: 1 }} />
          <button className="btn btn-ghost" disabled={adminBusy || !guild.trim()} onClick={() => sync(true)}>🧹 Limpar duplicados</button>
        </div>
        {adminMsg && <div className="note" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{adminMsg}</div>}
      </div>

      <div className="cmd-toolbar">
        <div className="muted" style={{ fontSize: 13 }}>Crie um comando de resposta personalizada.</div>
        <button className="btn btn-primary" onClick={() => setOpen(!open)}>＋ Criar comando</button>
      </div>
      {open && (
        <div className="creator">
          <div className="step-k">novo comando personalizado</div>
          <label>Nome (só letras minúsculas, sem espaços)</label>
          <input value={name} onChange={e => setName(e.target.value.replace(/[^a-z0-9_-]/g, ""))} placeholder="ex.: gostoso" />
          <label>Descrição</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="ex.: Descobre quantos % gostoso alguém é" />
          <label>Tipo de resposta</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="percent">Porcentagem aleatória (ex.: @user é 73% gostoso)</option>
            <option value="random">Frase aleatória (uma da lista, sorteada)</option>
            <option value="fixed">Texto fixo (responde sempre igual)</option>
          </select>
          <label>{type === "percent" ? "Adjetivo (ex.: gostoso)" : type === "random" ? "Frases (uma por linha)" : "Texto da resposta"}</label>
          <textarea value={resp} onChange={e => setResp(e.target.value)} placeholder={type === "percent" ? "gostoso" : type === "random" ? "Frase 1\nFrase 2\nFrase 3" : "Sua mensagem aqui. Use {user} para marcar quem usou."} />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={create} disabled={busy || !name || !desc}>{busy ? "Criando…" : "Criar e registrar"}</button>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
          {msg && <div className="note" style={{ marginTop: 12 }}>{msg}</div>}
        </div>
      )}
    </div>
  );
}
