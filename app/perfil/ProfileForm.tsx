"use client";
import { useState } from "react";

export default function ProfileForm({ initial }: { initial: any }) {
  const [username, setUsername] = useState(initial?.username || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.avatar || null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function readFile(file: File, set: (s: string) => void, prev?: (s: string) => void) {
    const r = new FileReader();
    r.onload = () => { const d = String(r.result); set(d); if (prev) prev(d); };
    r.readAsDataURL(file);
  }

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/bot-profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, description, avatar, banner }),
      });
      const data = await res.json();
      setMsg(data.message || (data.ok ? "Salvo!" : "Falhou."));
    } catch (e: any) { setMsg("❌ " + (e?.message || "erro")); }
    finally { setBusy(false); }
  }

  return (
    <div className="creator" style={{ marginTop: 0 }}>
      <div className="row" style={{ alignItems: "center", gap: 14 }}>
        <div className="glyph" style={{ width: 64, height: 64, borderRadius: 16 }}>
          {preview ? <img src={preview} alt="" /> : "?"}
        </div>
        <div>
          <label style={{ margin: 0 }}>Avatar</label>
          <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && readFile(e.target.files[0], setAvatar, setPreview)} />
        </div>
      </div>

      <label>Nome do bot</label>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="zoiudoAI" />
      <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>O nome só pode mudar 2x por hora (limite do Discord).</div>

      <label>Descrição (Sobre mim)</label>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Um bot que cria servidores por IA + moderação + zoeira." maxLength={400} />

      <label>Banner (opcional)</label>
      <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && readFile(e.target.files[0], setBanner)} />

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar no Discord"}</button>
      </div>
      {msg && <div className="note" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{msg}</div>}
    </div>
  );
}
