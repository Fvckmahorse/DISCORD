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
      <div className="cmd-toolbar">
        <div className="muted" style={{ fontSize: 13 }}>Os comandos se registram sozinhos a cada deploy — você não precisa registrar nada. 🎉</div>
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
