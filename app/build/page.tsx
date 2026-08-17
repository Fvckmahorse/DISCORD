"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { interpret, displayChannel, PERM_LABEL, type Result } from "@/lib/interpret";

const ICON: Record<string,string> = { text:"#", voice:"🔊", announcement:"📢", forum:"💬" };

function BuildInner() {
  const params = useSearchParams();
  const guildId = params.get("guild") || "";
  const guildName = params.get("name") || "seu servidor";

  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [applying, setApplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [log, setLog] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function build() { setLog(null); setErr(null); setResult(interpret(text)); }

  async function apply() {
    if (!result) return;
    setApplying(true); setErr(null); setLog(null); setConfirming(false);
    try {
      const res = await fetch("/api/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, config: result.config }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Falha ao aplicar."); }
      else {
        const l = [...data.log];
        if (data.errors?.length) l.push("", "⚠️ Alguns itens falharam:", ...data.errors);
        l.push("", `✓ Pronto: ${data.created.roles} cargos, ${data.created.categories} categorias, ${data.created.channels} canais.`);
        setLog(l);
      }
    } catch (e: any) { setErr(e?.message || "Erro de rede."); }
    finally { setApplying(false); }
  }

  const cfg = result?.config;
  const roleName = (k: string) => cfg?.roles.find(r => r.key===k)?.name || k;

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="mark" style={{ marginBottom: 0 }}>
          <div className="glyph">n</div>
          <div><div className="wordmark">nigg<span> AI</span></div><div className="eyebrow">construtor</div></div>
        </div>
        <a className="btn btn-ghost" href="/dashboard">← Voltar</a>
      </div>
      <div className="divider" />

      <div className="card">
        <div className="step-k">alvo: {guildName}</div>
        <h1 style={{ fontSize: 22, marginTop: 4 }}>Descreva o que criar</h1>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={`Ex.: Crie uma categoria INFORMAÇÕES com os canais regras, anúncios e novidades.\nRegras e anúncios somente leitura.\nCrie os cargos Owner, Moderator e Member.`} style={{ width:"100%", minHeight:170, background:"var(--ink)", color:"var(--text)", border:"1px solid var(--line)", borderRadius:10, padding:13, fontFamily:"var(--sans)", fontSize:14.5, lineHeight:1.55, marginTop:12 }} />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={build}>Montar prévia</button>
        </div>
      </div>

      {result && cfg && (
        <div className="card">
          <div className="step-k">prévia</div>
          <div className="servname"><span className="dot"></span>{guildName}</div>

          <div className="tree" style={{ marginTop: 10 }}>
            {cfg.categories.map((cat, i) => (
              <div className="cat" key={i}>
                <div className="cat-hd"><span className="ico">📁</span>{cat.name.toUpperCase()}{cat.private && <span className="tag priv">privada</span>}</div>
                {cat.private && <div className="cat-access">🔒 <b>Quem vê:</b> {cat.allow.length ? cat.allow.map(roleName).join(", ") : "ninguém definido"} · @everyone: sem acesso</div>}
                {cat.channels.length===0 && <div className="chan"><span className="ico">·</span><span className="nm" style={{ color:"var(--faint)" }}>sem canais</span></div>}
                {cat.channels.map((ch, j) => (
                  <div className="chan" key={j}>
                    <span className="ico">{ICON[ch.type] || "#"}</span>
                    <span className="nm">{displayChannel(ch.raw, ch.type)}</span>
                    <span className="tags">
                      {ch.type==="voice" && <span className="tag voice">voz</span>}
                      {ch.type==="announcement" && <span className="tag">anúncio</span>}
                      {ch.type==="forum" && <span className="tag">fórum</span>}
                      {ch.readonly && <span className="tag ro">somente leitura</span>}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {cfg.roles.length>0 && (
            <>
              <div className="step-k" style={{ marginTop: 18 }}>cargos</div>
              <div className="roles">
                {cfg.roles.map((r, i) => (
                  <div className="role" key={i}>
                    <span className="swatch" style={{ background:r.color }}></span><span className="rn">{r.name}</span>
                    <span className="perms">
                      {r.permissions.length ? r.permissions.map((p,k)=><span key={k} className={"perm"+(p==="ADMINISTRATOR"?" admin":"")}>{PERM_LABEL[p]||p}</span>) : <span className="perm none">padrão</span>}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(result.blocks.length>0 || result.warnings.length>0 || result.applied.length>0) && (
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
