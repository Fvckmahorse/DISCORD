"use client";
import { useState } from "react";

type Opt = { id: string; label: string; emoji?: string; color?: string; roleId?: string };
type Cat = { id: string; name: string; mode: "single" | "multiple"; options: Opt[] };
type Cfg = { channelId?: string; messageId?: string; title: string; description: string; color: string; categories: Cat[] };

const uid = () => Math.random().toString(36).slice(2, 8);

export default function RegistroManager({ guilds }: { guilds: { id: string; name: string }[] }) {
  const [guildId, setGuildId] = useState("");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragCat, setDragCat] = useState<number | null>(null);
  const [dragOpt, setDragOpt] = useState<{ ci: number; oi: number } | null>(null);

  async function pickGuild(id: string) {
    setGuildId(id); setMsg(null); setCfg(null); setChannels([]); setRoles([]);
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/registro?guild=${id}`); const d = await r.json();
      if (d.error) setMsg("⚠️ " + d.error);
      else { setChannels(d.channels || []); setRoles(d.roles || []); setCfg(d.config); }
    } catch (e: any) { setMsg("❌ " + e.message); }
    finally { setLoading(false); }
  }

  function up(f: (c: Cfg) => void) { setCfg((c) => { if (!c) return c; const n = { ...c, categories: [...c.categories] }; f(n); return n; }); }
  const addCat = () => up((c) => c.categories.push({ id: uid(), name: "Nova categoria", mode: "single", options: [] }));
  const delCat = (ci: number) => up((c) => c.categories.splice(ci, 1));
  const addOpt = (ci: number) => up((c) => c.categories[ci].options.push({ id: uid(), label: "Opção", color: "5865F2" }));
  const delOpt = (ci: number, oi: number) => up((c) => c.categories[ci].options.splice(oi, 1));

  // mover categoria (arrastar)
  const moveCat = (from: number, to: number) => up((c) => {
    if (from === to || to < 0 || to >= c.categories.length) return;
    const [m] = c.categories.splice(from, 1); c.categories.splice(to, 0, m);
  });
  // mover opção dentro da MESMA categoria (arrastar)
  const moveOpt = (ci: number, from: number, to: number) => up((c) => {
    const opts = c.categories[ci].options;
    if (from === to || to < 0 || to >= opts.length) return;
    const [m] = opts.splice(from, 1); opts.splice(to, 0, m);
  });

  async function save(action?: string) {
    if (!cfg) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/registro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guildId, config: cfg, action }) });
      const d = await r.json();
      setMsg((d.ok ? "✓ " : "⚠️ ") + d.message);
      if (d.ok && d.config) setCfg(d.config);
    } catch (e: any) { setMsg("❌ " + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="creator" style={{ marginTop: 0 }}>
      <label>Servidor</label>
      <select value={guildId} onChange={(e) => pickGuild(e.target.value)}>
        <option value="">— escolha um servidor —</option>
        {guilds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>

      {loading && <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>carregando…</div>}

      {cfg && (
        <>
          <label style={{ marginTop: 14 }}>Canal do Registro</label>
          <select value={cfg.channelId || ""} onChange={(e) => up((c) => (c.channelId = e.target.value))}>
            <option value="">— escolha um canal —</option>
            {channels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </select>

          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Título do painel</label>
              <input value={cfg.title} onChange={(e) => up((c) => (c.title = e.target.value))} />
            </div>
            <div style={{ width: 120 }}>
              <label>Cor (HEX)</label>
              <input value={cfg.color} onChange={(e) => up((c) => (c.color = e.target.value.replace("#", "")))} />
            </div>
          </div>
          <label>Descrição</label>
          <textarea value={cfg.description} onChange={(e) => up((c) => (c.description = e.target.value))} />

          <div className="divider" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="step-k" style={{ margin: 0 }}>categorias ({cfg.categories.length}/5)</div>
            <button className="btn btn-ghost" onClick={addCat} disabled={cfg.categories.length >= 5}>+ Nova categoria</button>
          </div>

          {cfg.categories.map((cat, ci) => (
            <div key={cat.id} className="cmd-category"
              style={{ ["--cat" as any]: "#5865f2", marginTop: 12, opacity: dragCat === ci ? 0.5 : 1 }}
              onDragOver={(e) => { if (dragCat !== null) e.preventDefault(); }}
              onDrop={(e) => { if (dragCat !== null) { e.preventDefault(); moveCat(dragCat, ci); setDragCat(null); } }}
            >
              <div style={{ padding: 14 }}>
                <div className="row reg-cat-head" style={{ gap: 10 }}>
                  <span
                    draggable
                    onDragStart={() => setDragCat(ci)}
                    onDragEnd={() => setDragCat(null)}
                    title="Arraste pra reordenar a categoria"
                    style={{ cursor: "grab", padding: "0 6px", color: "var(--faint)", fontSize: 18, userSelect: "none" }}
                  >⋮⋮</span>
                  <input value={cat.name} onChange={(e) => up((c) => (c.categories[ci].name = e.target.value))} placeholder="Nome (ex.: Gênero)" style={{ flex: 1 }} />
                  <select value={cat.mode} onChange={(e) => up((c) => (c.categories[ci].mode = e.target.value as any))} style={{ width: 160 }}>
                    <option value="single">Única (troca)</option>
                    <option value="multiple">Múltipla (liga/desliga)</option>
                  </select>
                  <button className="btn btn-ghost" onClick={() => delCat(ci)} style={{ padding: "6px 10px" }}>excluir</button>
                </div>

                {cat.options.map((o, oi) => (
                  <div key={o.id} className="row reg-opt"
                    style={{ gap: 8, marginTop: 8, alignItems: "center", opacity: dragOpt && dragOpt.ci === ci && dragOpt.oi === oi ? 0.5 : 1 }}
                    onDragOver={(e) => { if (dragOpt && dragOpt.ci === ci) e.preventDefault(); }}
                    onDrop={(e) => { if (dragOpt && dragOpt.ci === ci) { e.preventDefault(); moveOpt(ci, dragOpt.oi, oi); setDragOpt(null); } }}
                  >
                    <span className="drag"
                      draggable
                      onDragStart={() => setDragOpt({ ci, oi })}
                      onDragEnd={() => setDragOpt(null)}
                      title="Arraste pra reordenar a opção"
                      style={{ cursor: "grab", color: "var(--faint)", userSelect: "none", padding: "0 2px" }}
                    >⋮⋮</span>
                    <input className="reg-emoji" value={o.emoji || ""} onChange={(e) => up((c) => (c.categories[ci].options[oi].emoji = e.target.value))} placeholder="😀" style={{ width: 54 }} />
                    <input className="reg-label" value={o.label} onChange={(e) => up((c) => (c.categories[ci].options[oi].label = e.target.value))} placeholder="Nome da opção" style={{ flex: 1 }} />
                    <select className="reg-role" value={o.roleId || ""} onChange={(e) => up((c) => (c.categories[ci].options[oi].roleId = e.target.value || undefined))} style={{ width: 160 }}>
                      <option value="">criar cargo novo</option>
                      {roles.map((r) => <option key={r.id} value={r.id}>@{r.name}</option>)}
                    </select>
                    <input className="reg-color" value={o.color || ""} onChange={(e) => up((c) => (c.categories[ci].options[oi].color = e.target.value.replace("#", "")))} placeholder="cor" style={{ width: 70 }} title="cor do cargo (se for criar novo)" />
                    <button className="btn btn-ghost reg-del" onClick={() => delOpt(ci, oi)} style={{ padding: "6px 9px" }}>×</button>
                  </div>
                ))}
                <button className="btn btn-ghost" onClick={() => addOpt(ci)} style={{ marginTop: 8, fontSize: 13 }}>+ Adicionar opção</button>
              </div>
            </div>
          ))}

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => save()} disabled={busy}>💾 Salvar</button>
            <button className="btn btn-primary" onClick={() => save("publish")} disabled={busy || !cfg.channelId}>🚀 Criar/Atualizar Registro</button>
          </div>
          {msg && <div className="note" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{msg}</div>}
        </>
      )}
    </div>
  );
}
