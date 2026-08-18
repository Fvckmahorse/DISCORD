"use client";
import { useState, useEffect } from "react";

const STATUS = [
  { v: "online", label: "🟢 Online" },
  { v: "idle", label: "🌙 Ausente" },
  { v: "dnd", label: "⛔ Não perturbe" },
  { v: "invisible", label: "⚪ Invisível" },
];
const TYPES = [
  { v: "playing", label: "Jogando" },
  { v: "listening", label: "Ouvindo" },
  { v: "watching", label: "Assistindo" },
  { v: "competing", label: "Competindo em" },
];

export default function PresenceForm() {
  const [status, setStatus] = useState("online");
  const [activityType, setActivityType] = useState("watching");
  const [activityText, setActivityText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/presence").then(r => r.json()).then(p => {
      setStatus(p.status || "online"); setActivityType(p.activityType || "watching"); setActivityText(p.activityText || "");
    }).catch(() => {});
  }, []);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, activityType, activityText }) });
      const d = await r.json();
      setMsg((d.ok ? "✓ " : "⚠️ ") + d.message);
    } catch (e: any) { setMsg("❌ " + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="creator">
      <div className="step-k">status do bot</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Muda a bolinha e a atividade. O bot atualiza em até ~1 minuto (precisa do serviço 24/7 ligado).</p>
      <label>Status</label>
      <select value={status} onChange={e => setStatus(e.target.value)}>{STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}</select>
      <label>Atividade</label>
      <div className="row">
        <select value={activityType} onChange={e => setActivityType(e.target.value)} style={{ flex: "0 0 40%" }}>{TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}</select>
        <input value={activityText} onChange={e => setActivityText(e.target.value)} placeholder="Backrooms" style={{ flex: 1 }} />
      </div>
      <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>Prévia: <b>{TYPES.find(t => t.v === activityType)?.label} {activityText || "…"}</b></div>
      <div className="row" style={{ marginTop: 14 }}><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar status"}</button></div>
      {msg && <div className="note" style={{ marginTop: 12 }}>{msg}</div>}
    </div>
  );
}
