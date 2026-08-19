"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { channelLabel, categoryLabel, PERM_LABEL, renderRolesText, type Result } from "@/lib/interpret";

const ICON: Record<string,string> = { text:"#", voice:"🔊", announcement:"📢", forum:"💬" };

function BuildInner() {
  const params = useSearchParams();
  const guildId = params.get("guild") || "";
  const guildName = params.get("name") || "seu servidor";

  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [engine, setEngine] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const [building, setBuilding] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [log, setLog] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; message: string } | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  async function build() {
    if (!text.trim()) return;
    setBuilding(true); setLog(null); setErr(null); setConfirming(false);
    try {
      const res = await fetch("/api/interpret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Falha ao interpretar."); setResult(null); }
      else { setResult(data); setEngine(data.engine || ""); setAiError(data.aiError || ""); }
    } catch (e: any) { setErr(e?.message || "Erro de rede."); }
    finally { setBuilding(false); }
  }

  async function apply() {
    if (!result) return;
    setApplying(true); setErr(null); setLog(null); setConfirming(false); setElapsed(null);
    const cfg = result.config;
    const total = cfg.roles.length + cfg.categories.length + cfg.categories.reduce((s: number, c: any) => s + c.channels.length, 0);
    setProgress({ done: 0, total, message: "Criando no Discord…" });
    const startedAt = Date.now();
    const estMs = Math.max(1500, total * 260); // estimativa pra animar suave
    const timer = setInterval(() => {
      setProgress((p) => {
        if (!p) return p;
        const frac = Math.min(0.92, (Date.now() - startedAt) / estMs);
        const done = Math.max(p.done, Math.floor(frac * p.total));
        return { ...p, done };
      });
    }, 200);
    try {
      const res = await fetch("/api/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guildId, config: cfg }) });
      const data = await res.json();
      clearInterval(timer);
      if (!res.ok) { setErr(data.error || "Falha ao aplicar."); setProgress(null); }
      else {
        const l = [...data.log];
        if (data.errors?.length) l.push("", "⚠️ Alguns itens falharam:", ...data.errors);
        l.push("", `✓ Pronto: ${data.created.roles} cargos, ${data.created.categories} categorias, ${data.created.channels} canais.`);
        setLog(l);
        setElapsed(data.ms ?? (Date.now() - startedAt));
        setProgress({ done: total, total, message: "Concluído" });
      }
    } catch (e: any) { clearInterval(timer); setErr(e?.message || "Erro de rede."); }
    finally { setApplying(false); }
  }

  function fmtTime(ms: number): string {
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60); const r = Math.round(s % 60);
    return `${m}min ${r}s`;
  }

  const cfg = result?.config;
  const roleName = (k: string) => cfg?.roles.find(r => r.key === k)?.name || k;

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="mark" style={{ marginBottom: 0 }}>
          <div className="glyph"><img src="/logo.png" alt="zoiudoAI" /></div>
          <div><div className="wordmark">zoiudo<span>AI</span></div><div className="eyebrow">construtor</div></div>
        </div>
        <a className="btn btn-ghost" href="/dashboard">← Voltar</a>
      </div>
      <div className="divider" />

      <div className="card">
        <div className="step-k">alvo: {guildName}</div>
        <h1 style={{ fontSize: 22, marginTop: 4 }}>Descreva o que criar</h1>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={`Ex.: Crie uma categoria INFORMAÇÕES com regras, anúncios e novidades. Regras e anúncios somente leitura.\nCrie uma categoria STAFF privada para Owner e Moderator.\nTodos os canais devem começar com emoji.\nCrie os cargos Owner, Moderator e Member.`} style={{ width:"100%", minHeight:170, background:"var(--ink)", color:"var(--text)", border:"1px solid var(--line)", borderRadius:10, padding:13, fontFamily:"var(--sans)", fontSize:14.5, lineHeight:1.55, marginTop:12 }} />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={build} disabled={building}>{building ? "Interpretando…" : "Montar prévia"}</button>
          {engine && <span className="faint" style={{ fontFamily:"var(--mono)", fontSize:12 }}>motor: {engine}</span>}
        </div>
        {aiError && <div className="note warn" style={{ marginTop: 10 }}><span className="ic">!</span><span>IA indisponível — usando o interpretador local. Motivo: <code style={{fontFamily:"var(--mono)"}}>{aiError}</code></span></div>}
      </div>

      {result && cfg && (
        <div className="card">
          <div className="step-k">prévia</div>
          <div className="servname"><span className="dot"></span>{guildName}</div>

          <div className="tree" style={{ marginTop: 10 }}>
            {cfg.categories.map((cat, i) => (
              <div className="cat" key={i}>
                <div className="cat-hd"><span className="ico">📁</span>{categoryLabel(cat).toUpperCase()}{cat.private && <span className="tag priv">privada</span>}</div>
                {cat.private && <div className="cat-access">🔒 <b>Quem vê:</b> {cat.allow.length ? cat.allow.map(roleName).join(", ") : "ninguém definido"} · @everyone: sem acesso</div>}
                {cat.channels.length === 0 && <div className="chan"><span className="ico">·</span><span className="nm" style={{ color:"var(--faint)" }}>sem canais</span></div>}
                {cat.channels.map((ch, j) => (
                  <div className="chan" key={j}>
                    <span className="ico">{ICON[ch.type] || "#"}</span>
                    <span className="nm">{channelLabel(ch)}</span>
                    <span className="tags">
                      {ch.type === "voice" && <span className="tag voice">voz</span>}
                      {ch.type === "announcement" && <span className="tag">anúncio</span>}
                      {ch.type === "forum" && <span className="tag">fórum</span>}
                      {ch.readonly && <span className="tag ro">somente leitura</span>}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {cfg.roles.length > 0 && (
            <>
              <div className="step-k" style={{ marginTop: 18 }}>cargos</div>
              <pre style={{ margin: "8px 0 0", padding: 14, background: "var(--ink)", border: "1px solid var(--line)", borderRadius: 10, fontFamily: "var(--mono)", fontSize: 13, color: "#e7e9f1", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{renderRolesText(cfg.roles)}</pre>
            </>
          )}

          {(result.blocks.length > 0 || result.warnings.length > 0 || result.applied.length > 0) && (
            <>
              <div className="step-k" style={{ marginTop: 18 }}>segurança & avisos</div>
              <div className="notices">
                {result.blocks.map((t,i)=><div key={"b"+i} className="note block"><span className="ic">✕</span><span>{t}</span></div>)}
                {result.warnings.map((t,i)=><div key={"w"+i} className="note warn"><span className="ic">!</span><span>{t}</span></div>)}
                {result.applied.map((t,i)=><div key={"a"+i} className="note ok"><span className="ic">✓</span><span>{t}</span></div>)}
              </div>
            </>
          )}

          <div className="divider" />
          {!confirming ? (
            <button className="btn btn-primary" onClick={()=>setConfirming(true)} disabled={applying}>Aplicar ao Discord</button>
          ) : (
            <div className="note warn">
              <span className="ic">?</span>
              <span>Isso vai <b>criar</b> esses itens em <b>{guildName}</b>. Confirmar?
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn btn-primary" onClick={apply} disabled={applying}>{applying ? "Aplicando…" : "Confirmar e criar"}</button>
                  <button className="btn btn-ghost" onClick={()=>setConfirming(false)} disabled={applying}>Cancelar</button>
                </div>
              </span>
            </div>
          )}

          {err && <div className="note block" style={{ marginTop: 14 }}><span className="ic">✕</span><span>{err}</span></div>}
          {progress && (progress.total > 0 || applying) && (
            <div style={{ marginTop: 16 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <span className="step-k" style={{ margin: 0 }}>{applying ? "criando no discord…" : "concluído"}</span>
                <span className="faint" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                  {progress.total ? Math.round((progress.done / progress.total) * 100) : 0}% · {progress.done}/{progress.total}
                </span>
              </div>
              <div className="progress"><span style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} /></div>
              {applying && <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>{progress.message}</div>}
            </div>
          )}

          {elapsed != null && !applying && (
            <div className="note" style={{ marginTop: 12, borderColor: "#57f28755", color: "var(--allow)" }}>
              ⏱️ Servidor montado em <b style={{ marginLeft: 4 }}>{fmtTime(elapsed)}</b>
            </div>
          )}

          {log && <pre style={{ marginTop:14, padding:14, background:"var(--ink)", border:"1px solid var(--line)", borderRadius:10, fontFamily:"var(--mono)", fontSize:12.5, color:"#c9d1e6", whiteSpace:"pre-wrap" }}>{log.join("\n")}</pre>}
        </div>
      )}
    </main>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={<main className="wrap"><div className="muted">Carregando…</div></main>}>
      <BuildInner />
    </Suspense>
  );
}
