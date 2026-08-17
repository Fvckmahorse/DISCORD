"use client";
import { useState } from "react";

export default function RegisterButtons() {
  const [guild, setGuild] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register(useGuild: boolean) {
    setBusy(true); setMsg(null);
    try {
      const q = useGuild && guild ? `?guild=${encodeURIComponent(guild.trim())}` : "";
      const res = await fetch(`/api/register-commands${q}`);
      const data = await res.json();
      if (!res.ok) setMsg("❌ " + (data.error || `Erro ${data.status}`));
      else setMsg(`✓ ${data.registered} comandos registrados — ${data.scope}.`);
    } catch (e: any) { setMsg("❌ " + (e?.message || "erro")); }
    finally { setBusy(false); }
  }

  return (
    <div className="box" style={{ marginTop: 16 }}>
      <div className="step-k">registrar no discord</div>
      <p className="muted" style={{ marginTop: 6 }}>
        Cole o <b>ID do seu servidor</b> pra testar na hora (recomendado). Sem ID, registra global (pode demorar até 1h).
      </p>
      <input value={guild} onChange={(e) => setGuild(e.target.value)} placeholder="ID do servidor (opcional)"
        style={{ width: "100%", background: "var(--ink)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 10, padding: 11, marginBottom: 10 }} />
      <div className="row">
        <button className="btn btn-primary" disabled={busy} onClick={() => register(true)}>{busy ? "Registrando…" : "Registrar no meu servidor"}</button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => register(false)}>Registrar global</button>
      </div>
      {msg && <div className="note" style={{ marginTop: 12 }}>{msg}</div>}
    </div>
  );
}
