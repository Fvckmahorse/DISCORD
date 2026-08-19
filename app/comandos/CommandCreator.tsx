"use client";
import { useState, useEffect } from "react";

const PERMS = [
  { label: "Todos podem usar", value: "" },
  { label: "Só quem tem Gerenciar Mensagens", value: "8192" },
  { label: "Só Administradores", value: "8" },
  { label: "Só quem pode Moderar Membros", value: "1099511627776" },
];

export default function CommandCreator() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("percent");
  const [perm, setPerm] = useState("");
  const [resp, setResp] = useState("");
  const [image, setImage] = useState("");
  const [imgName, setImgName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guild, setGuild] = useState("");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [customs, setCustoms] = useState<any[]>([]);
  const [ready, setReady] = useState(true);
  const [editing, setEditing] = useState(false);

  function startEdit(c: any) {
    setEditing(true); setOpen(true);
    setName(c.name); setDesc(c.description || ""); setType(c.type || "fixed");
    setPerm(c.permission || ""); setResp(c.data || "");
    setImage(c.image || ""); setImgName(c.image && c.image.startsWith("data:") ? "imagem salva" : "");
    setMsg(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetForm() {
    setEditing(false); setName(""); setDesc(""); setType("percent"); setPerm(""); setResp(""); setImage(""); setImgName(""); setMsg(null);
  }

  async function load() {
    try { const r = await fetch("/api/commands/create"); const d = await r.json(); setCustoms(d.commands || []); setReady(d.ready !== false); } catch {}
  }
  useEffect(() => { load(); }, []);

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
      const res = await fetch("/api/commands/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: desc, type, response: resp, permission: perm || null, image }) });
      const data = await res.json();
      setMsg((data.ok ? "✓ " : "⚠️ ") + data.message);
      if (data.ok) { resetForm(); load(); }
    } catch (e: any) { setMsg("❌ " + (e?.message || "erro")); }
    finally { setBusy(false); }
  }
  async function remove(n: string) {
    if (!confirm(`Excluir /${n}?`)) return;
    await fetch(`/api/commands/create?name=${encodeURIComponent(n)}`, { method: "DELETE" });
    load();
  }

  const respLabel = type === "percent" ? "Adjetivo (ex.: gostoso)" : type === "random" ? "Frases (uma por linha)" : type === "action" ? "Ação (ex.: deu um abraço em)" : "Texto fixo";
  const respPh = type === "percent" ? "gostoso" : type === "random" ? "Frase 1\nFrase 2\nFrase 3" : type === "action" ? "deu um abraço em" : "Sua mensagem. Use {user} (quem usou) e {alvo}.";

  return (
    <div>
      <div className="creator" style={{ marginTop: 0, marginBottom: 12 }}>
        <div className="step-k">registro & duplicados</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Os comandos se registram sozinhos a cada deploy. Use abaixo só se precisar forçar ou tirar duplicatas.</p>
        <div className="row" style={{ marginTop: 8 }}><button className="btn btn-ghost" disabled={adminBusy} onClick={() => sync(false)}>🔄 Sincronizar (global)</button></div>
        <label style={{ marginTop: 12 }}>Remover duplicados de um servidor (ID)</label>
        <div className="row"><input value={guild} onChange={e => setGuild(e.target.value)} placeholder="ID do servidor" style={{ flex: 1 }} /><button className="btn btn-ghost" disabled={adminBusy || !guild.trim()} onClick={() => sync(true)}>🧹 Limpar</button></div>
        {adminMsg && <div className="note" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{adminMsg}</div>}
      </div>

      <div className="cmd-toolbar">
        <div className="muted" style={{ fontSize: 13 }}>{ready ? "Crie ou edite comandos de resposta personalizada." : "⚠️ Conecte o banco (Upstash) na Vercel pra criar comandos."}</div>
        <button className="btn btn-primary" onClick={() => { if (open) { resetForm(); setOpen(false); } else { setOpen(true); } }}>{open ? "Fechar" : "＋ Criar comando"}</button>
      </div>

      {open && (
        <div className="creator">
          <div className="step-k">{editing ? `editando /${name}` : "novo comando"}</div>
          <label>Nome (minúsculas, sem espaços)</label>
          <input value={name} disabled={editing} onChange={e => setName(e.target.value.replace(/[^a-z0-9_-]/g, ""))} placeholder="gostoso" style={editing ? { opacity: .6 } : undefined} />
          {editing && <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>Pra renomear, exclua e crie de novo (o nome é a identidade do comando).</div>}
          <label>Descrição</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descobre quantos % gostoso alguém é" />
          <label>Tipo de resposta</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="percent">Porcentagem aleatória (@user é X% ...)</option>
            <option value="random">Frase aleatória (sorteia da lista)</option>
            <option value="fixed">Texto fixo (sempre igual)</option>
            <option value="action">Ação/roleplay (@user deu ... em @alvo)</option>
            <option value="image">Imagem (manda uma foto + texto)</option>
          </select>
          <label>Quem pode usar</label>
          <select value={perm} onChange={e => setPerm(e.target.value)}>{PERMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
          {type === "image" ? (
            <>
              <label>Imagem — anexe um arquivo</label>
              <input type="file" accept="image/*" onChange={e => {
                const f = e.target.files?.[0]; if (!f) return;
                if (f.size > 350 * 1024) { setMsg("⚠️ Imagem muito grande (máx. ~350KB). Use uma menor ou cole uma URL."); return; }
                const r = new FileReader(); r.onload = () => { setImage(String(r.result)); setImgName(f.name); }; r.readAsDataURL(f);
              }} />
              {imgName && <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>Anexado: {imgName}</div>}
              <label>…ou cole uma URL de imagem</label>
              <input value={image.startsWith("data:") ? "" : image} onChange={e => { setImage(e.target.value); setImgName(""); }} placeholder="https://.../foto.png" />
              <label>Texto (opcional) — aparece junto da imagem</label>
              <textarea value={resp} onChange={e => setResp(e.target.value)} placeholder="macarrão com salsicha" />
            </>
          ) : (
            <>
              <label>{respLabel}</label>
              <textarea value={resp} onChange={e => setResp(e.target.value)} placeholder={respPh} />
            </>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={create} disabled={busy || !name || !desc}>{busy ? "Salvando…" : editing ? "Salvar alterações" : "Criar e registrar"}</button>
            <button className="btn btn-ghost" onClick={() => { resetForm(); setOpen(false); }}>Cancelar</button>
          </div>
          {msg && <div className="note" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{msg}</div>}
        </div>
      )}

      {customs.length > 0 && (
        <div className="cmd-category" style={{ ["--cat" as any]: "#43b581", marginTop: 16 }}>
          <div className="cmd-category-header"><span className="cat-emoji">✨</span><div><h2>Seus comandos</h2><p>Comandos personalizados que você criou.</p></div><span className="count">{customs.length}</span></div>
          <div className="cmd-list">
            {customs.map((c) => (
              <div className="cmd-entry" key={c.name}>
                <div className="command-entry-label"><span className="cmd-pill">/{c.name}</span></div>
                <div className="cmd-desc">{c.description}</div>
                <div className="cmd-meta"><span className="tagp">{c.type}</span><span className="tagp">{c.permission ? "restrito" : "todos"}</span>
                  <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => startEdit(c)}>editar</button>
                  <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => remove(c.name)}>excluir</button></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
