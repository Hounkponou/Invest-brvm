/**
 * RiskPanel — « Analyse du risque » du détail action, en LIGNES clé/valeur
 * (plus de tuiles-stat). Interprétations en clair, VaR à horizon choisi,
 * histogramme de distribution.
 */
import React, { useState } from "react";

const LIQ_COLOR = { Liquide: "var(--up-color)", "Peu liquide": "var(--warn-color)", Illiquide: "var(--down-color)" };
const VAR_LABELS = { "1": "1 jour", "5": "1 semaine", "10": "2 semaines", "20": "1 mois" };

const fmtPct = (v, d = 1) => (v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(d)} %`);
const fmtInt = (v) => (v == null ? "—" : Math.round(Number(v)).toLocaleString("fr-FR"));

/** Ligne clé/valeur alignée (remplace la tuile). */
function Row({ label, value, color, note }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "9px 0", borderBottom: "1px solid var(--border-color)" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>
        {label}{note && <span style={{ display: "block", fontSize: "0.9em", opacity: 0.8 }}>{note}</span>}
      </div>
      <div style={{ fontWeight: 700, color: color || "var(--text-main)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function Hint({ children }) {
  return <div style={{ fontSize: "0.8em", color: "var(--text-muted)", marginTop: 10, lineHeight: 1.45 }}>💡 {children}</div>;
}

function Histogram({ distribution }) {
  const counts = distribution?.counts || [];
  const edges = distribution?.edges || [];
  if (counts.length < 3) return null;
  const maxC = Math.max(...counts, 1);
  const n = counts.length, W = 100, H = 40, gap = 0.6, bw = W / n;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="120" preserveAspectRatio="none" role="img" aria-label="Distribution des rendements">
      {counts.map((c, i) => {
        const mid = ((edges[i] ?? 0) + (edges[i + 1] ?? 0)) / 2;
        const h = (c / maxC) * H;
        const color = mid < -1e-9 ? "var(--down-color)" : mid > 1e-9 ? "var(--up-color)" : "var(--text-muted)";
        return <rect key={i} x={i * bw + gap / 2} y={H - h} width={bw - gap} height={h} fill={color} opacity={0.75} />;
      })}
      <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="var(--border-color)" strokeWidth={0.4} strokeDasharray="1 1" />
    </svg>
  );
}

export default function RiskPanel({ risk }) {
  const horizons = risk?.var?.horizons || {};
  const available = Object.keys(horizons);
  const [varH, setVarH] = useState(available.includes("10") ? "10" : available[0] || "1");

  if (!risk) return null;
  const liq = risk.liquidity || {};
  const vol = risk.volatility || {};
  const beta = risk.beta || {};
  const dist = risk.distribution || {};
  const illiquidWarn = (liq.zeroTradePct || 0) >= 15 || liq.level === "Illiquide";
  const betaVal = beta.sector != null ? beta.sector : beta.market;
  const betaRef = beta.sector != null ? beta.sectorName : "Marché";
  const vh = horizons[varH] || {};

  const wrap = { background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 10, padding: 20, marginTop: 20 };

  return (
    <div style={wrap}>
      <h3 style={{ margin: "0 0 4px 0", color: "var(--text-main)" }}>Analyse du risque</h3>
      <div style={{ color: "var(--text-muted)", fontSize: "0.82em", marginBottom: 12 }}>
        Informatif — mesure la fiabilité et le risque du titre (n'est pas un conseil).
      </div>

      {/* Lignes clé/valeur */}
      <div>
        <Row label="Liquidité" note={`${fmtInt(liq.avgVol)} titres/j · ${fmtPct(liq.zeroTradePct)} de jours blancs`}
          value={liq.level || "—"} color={LIQ_COLOR[liq.level]} />
        <Row label="Volume échangé (moyen)" note="valeur négociée par séance" value={`${fmtInt(liq.turnover)} F/j`} />
        <Row label="Bêta sectoriel" note={`vs ${betaRef}`} value={betaVal != null ? betaVal.toFixed(2) : "—"} color="var(--accent-blue)" />
        <Row label="Volatilité annualisée" note={vol.adj !== vol.raw ? `ajustée · brute ${fmtPct(vol.raw)}` : "écart-type annualisé"}
          value={fmtPct(vol.adj)} />
      </div>
      <Hint>
        <strong>Liquidité</strong> : plus il y a de jours blancs, plus il est dur d'acheter/vendre au prix voulu.
        <strong> Bêta</strong> : 1 = bouge comme {betaRef.toLowerCase()} ; supérieur à 1 amplifie, inférieur à 1 amortit.
        <strong> Volatilité</strong> : amplitude typique sur un an (version ajustée = détachements de dividende exclus).
      </Hint>

      {illiquidWarn && (
        <div style={{ border: "1px solid var(--warn-color)", borderRadius: 8, padding: "10px 14px", marginTop: 12, fontSize: "0.85em", color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--warn-color)" }}>Risque d'illiquidité.</strong> Le cours peut rester plat par manque
          d'acheteurs/vendeurs — ce n'est <strong style={{ color: "var(--text-main)" }}>pas</strong> une absence de volatilité,
          mais un risque de ne pas pouvoir vendre au prix affiché.
        </div>
      )}

      {/* VaR historique à horizon choisi */}
      {available.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "2px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: "0.8em", fontWeight: 700, color: "var(--text-main)" }}>Perte maximale probable (VaR historique)</div>
            <div style={{ display: "inline-flex", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" }}>
              {available.map((k) => (
                <button key={k} type="button" onClick={() => setVarH(k)}
                  style={{ border: "none", cursor: "pointer", padding: "4px 10px", fontSize: "0.8em", fontWeight: 700,
                    background: varH === k ? "var(--accent-blue)" : "transparent", color: varH === k ? "#fff" : "var(--text-muted)" }}>
                  {VAR_LABELS[k] || `${k} j`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Row label="Confiance 95 %" value={fmtPct(vh.p95)} color="var(--down-color)" />
            <Row label="Confiance 99 %" value={fmtPct(vh.p99)} color="var(--down-color)" />
            <Row label="Pire cas moyen (CVaR)" value={fmtPct(vh.cvar)} color="var(--down-color)" />
          </div>
          <Hint>
            Sur <strong>{VAR_LABELS[varH]}</strong>, dans <strong>95 %</strong> des cas historiques la perte n'a pas dépassé
            <strong> {fmtPct(vh.p95)}</strong>. Les 5 % de scénarios les plus durs sont pires — moyenne (CVaR)
            <strong> {fmtPct(vh.cvar)}</strong>. Calcul <em>historique</em> : intègre les chocs rares mais intenses.
          </Hint>
        </div>
      )}

      {/* Distribution */}
      {(dist.counts || []).length > 2 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "2px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: "0.8em", fontWeight: 700, color: "var(--text-main)" }}>Distribution des rendements journaliers</div>
            <div style={{ fontSize: "0.8em", color: "var(--text-muted)" }}>
              Kurtosis <strong style={{ color: (dist.kurt || 0) > 3 ? "var(--down-color)" : "var(--text-main)" }}>{dist.kurt}</strong>
            </div>
          </div>
          <div style={{ marginTop: 8 }}><Histogram distribution={dist} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72em", color: "var(--text-muted)" }}>
            <span>← pertes</span><span>0</span><span>gains →</span>
          </div>
          <Hint>
            Chaque barre = fréquence d'un niveau de rendement (rouge = baisses, vert = hausses). Un pic central étroit avec des
            barres aux extrêmes = journées calmes mais chocs occasionnels violents.{(dist.kurt || 0) > 3 ? " Le kurtosis élevé confirme ces « queues épaisses »." : ""}
          </Hint>
        </div>
      )}
    </div>
  );
}
