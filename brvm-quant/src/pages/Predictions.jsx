/**
 * Predictions.jsx — LE MODULE PRÉDICTIF (table de signaux triable).
 * ================================================================
 * Signaux du jour en TABLE dense et triable (clic sur en-tête) — plus de grille
 * de cartes/jauges/pastilles. Clic sur une ligne -> détail de l'action.
 * Onglets : « Signaux du jour » et « Challenge » (backtest), sélecteur d'horizon
 * commun, filtre par type de signal.
 */
import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import BacktestPanel from "../components/prediction/BacktestPanel";
import DataTable, { ScoreBar } from "../components/DataTable";
import { FilterChips } from "../components/filters";
import { getSector } from "../utils/brvmConfig";
import {
  computeBacktest, getSignal, getScore10, getGeminiScore10, getFinalDirective,
  getTargetPrice, getSeasonMeta, formatFcfa, horizonTarget, HORIZONS,
} from "../utils/predictionHelpers";

const FILTERS = [
  { key: "all", label: "Tous" },
  { key: "Achat Fort", label: "Achat Fort" },
  { key: "Achat Modéré", label: "Achat Modéré" },
  { key: "Conserver", label: "Conserver" },
  { key: "Vente", label: "Vente" },
];

const HORIZON_OPTIONS = [...HORIZONS.map((h) => ({ key: h.days, label: h.short })), { key: "all", label: "Tous" }];
const DIR_RANK = { ACHAT: 2, CONSERVER: 1, VENTE: 0 };

export default function Predictions({ embedded = false }) {
  const {
    searchQuery = "", globalSector = "All", marketData = [], setSelectedStock,
    predictions = {}, geminiBySymbol = {}, seasonBySymbol = {},
  } = useOutletContext() || {};

  const { live = [], closed = [], latestDate = null, loading = false, error = null, refetch = () => {} } = predictions;

  const [tab, setTab] = useState("signals");
  const [filter, setFilter] = useState("all");
  const [horizon, setHorizon] = useState(20);

  const marketBySymbol = useMemo(() => {
    const m = {};
    (marketData || []).forEach((d) => { if (d?.symbole) m[d.symbole] = d; });
    return m;
  }, [marketData]);

  const backtest = useMemo(() => computeBacktest(closed, horizon === "all" ? null : horizon), [closed, horizon]);

  const filteredLive = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return live.filter((p) => {
      if (horizon !== "all" && Number(p.horizon_jours) !== Number(horizon)) return false;
      if (filter !== "all" && getSignal(p) !== filter) return false;
      if (q) {
        const hay = `${p.symbole ?? ""} ${p.nom ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (globalSector !== "All" && getSector(p.symbole) !== globalSector) return false;
      return true;
    });
  }, [live, horizon, filter, searchQuery, globalSector]);

  const counts = useMemo(() => {
    const rows = horizon === "all" ? live : live.filter((p) => Number(p.horizon_jours) === Number(horizon));
    let fort = 0, modere = 0, conserver = 0, vente = 0;
    rows.forEach((p) => {
      const s = getSignal(p);
      if (s === "Achat Fort") fort += 1;
      else if (s === "Achat Modéré") modere += 1;
      else if (s === "Vente") vente += 1;
      else conserver += 1;
    });
    return { fort, modere, conserver, vente, total: rows.length };
  }, [live, horizon]);

  // Colonnes de la table de signaux (triables via DataTable).
  const columns = useMemo(() => [
    {
      key: "symbole", label: "Titre", align: "left", type: "str",
      render: (p) => (<><span className="mt-sym">{p.symbole}</span><span className="mt-nom">{getSector(p.symbole)}</span></>),
    },
    {
      key: "directive", label: "Directive", align: "left", type: "num",
      accessor: (p) => DIR_RANK[getFinalDirective(p, geminiBySymbol[p.symbole]).label] ?? 1,
      render: (p) => {
        const d = getFinalDirective(p, geminiBySymbol[p.symbole]);
        return <span style={{ color: d.color, fontWeight: 800, letterSpacing: "0.02em" }}>{d.label}</span>;
      },
    },
    { key: "score", label: "Score", align: "left", type: "num", accessor: (p) => getScore10(p), render: (p) => <ScoreBar score={getScore10(p)} /> },
    { key: "proba", label: "Proba", align: "num", type: "num", accessor: (p) => Number(p.probabilite_modele || 0),
      render: (p) => `${Math.round((p.probabilite_modele || 0) * 100)}%` },
    {
      key: "cible", label: "Cours cible", align: "num", type: "num", hideSm: true,
      accessor: (p) => getTargetPrice(p, marketBySymbol[p.symbole], getFinalDirective(p, geminiBySymbol[p.symbole]), p.horizon_jours, horizonTarget(p.horizon_jours))?.central || 0,
      render: (p) => {
        const t = getTargetPrice(p, marketBySymbol[p.symbole], getFinalDirective(p, geminiBySymbol[p.symbole]), p.horizon_jours, horizonTarget(p.horizon_jours));
        return t ? formatFcfa(t.central) : "—";
      },
    },
    { key: "ia", label: "Score IA", align: "num", type: "num", hideSm: true,
      accessor: (p) => getGeminiScore10(geminiBySymbol[p.symbole]) ?? -1,
      render: (p) => { const s = getGeminiScore10(geminiBySymbol[p.symbole]); return s == null ? "—" : `${s}/10`; } },
    {
      key: "saison", label: "Saison", align: "left", type: "num", hideSm: true,
      accessor: (p) => seasonBySymbol[p.symbole]?.season_score ?? 0,
      render: (p) => {
        const m = getSeasonMeta(seasonBySymbol[p.symbole]);
        return <span style={{ color: m.color, fontWeight: 700 }} title={seasonBySymbol[p.symbole]?.season_label || ""}>{m.arrow}</span>;
      },
    },
  ], [geminiBySymbol, seasonBySymbol, marketBySymbol]);

  // Clic sur un signal -> modale de détail (cours + trajectoires prédites + risque).
  const openDetail = (p) => { const it = marketBySymbol[p.symbole]; if (it) setSelectedStock?.(it); };

  const Stat = ({ label, value, color }) => (
    <span style={{ whiteSpace: "nowrap" }}>
      <span style={{ color: "var(--text-muted)" }}>{label} </span>
      <strong style={{ color: color || "var(--text-main)", fontVariantNumeric: "tabular-nums" }}>{value}</strong>
    </span>
  );

  return (
    <div>
      {!embedded && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, borderBottom: "2px solid var(--border-color)", paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: "var(--text-main)" }}>Signaux prédictifs</h2>
            <div style={{ fontSize: "0.85em", color: "var(--text-muted)", marginTop: 2 }}>
              XGBoost multi-horizons (5 / 20 / 60 j){latestDate ? ` · séance du ${latestDate}` : ""}
            </div>
          </div>
          <button type="button" onClick={refetch}
            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-panel)", color: "var(--text-main)", fontWeight: 600, cursor: "pointer" }}>
            Actualiser
          </button>
        </div>
      )}

      {/* Horizon + résumé inline (plus de tuiles) */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ display: "inline-flex", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" }}>
          {HORIZON_OPTIONS.map((h) => (
            <button key={h.key} type="button" onClick={() => setHorizon(h.key)}
              style={{ border: "none", cursor: "pointer", padding: "6px 12px", fontSize: "0.85em", fontWeight: 700,
                background: horizon === h.key ? "var(--accent-blue)" : "transparent", color: horizon === h.key ? "#fff" : "var(--text-muted)" }}>
              {h.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: "0.9em" }}>
          <Stat label="Signaux" value={counts.total} color="var(--accent-blue)" />
          <Stat label="Achat Fort" value={counts.fort} color="var(--up-color)" />
          <Stat label="Modéré" value={counts.modere} color="var(--warn-color)" />
          <Stat label="Conserver" value={counts.conserver} color="var(--text-muted)" />
          <Stat label="Vente" value={counts.vente} color="var(--down-color)" />
          <Stat label="Fiabilité" value={backtest.total ? `${backtest.hitRate}%` : "—"} />
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: "inline-flex", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>
        {[{ key: "signals", label: "Signaux du jour" }, { key: "challenge", label: "Challenge" }].map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{ border: "none", cursor: "pointer", padding: "8px 16px", fontSize: "0.9em", fontWeight: 700,
              background: tab === t.key ? "var(--accent-blue)" : "transparent", color: tab === t.key ? "#fff" : "var(--text-muted)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />}
      {error && !loading && (
        <div style={{ border: "1px solid var(--down-color)", color: "var(--down-color)", borderRadius: 8, padding: 20, textAlign: "center" }}>{error}</div>
      )}

      {/* SIGNAUX — table triable */}
      {!loading && !error && tab === "signals" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
            <span style={{ fontSize: "0.8em", color: "var(--text-muted)" }}>cliquez un en-tête pour trier ↑↓ · une ligne pour le détail</span>
          </div>
          {filteredLive.length === 0 ? (
            <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              Aucun signal ne correspond à ces filtres.
            </div>
          ) : (
            <DataTable columns={columns} rows={filteredLive} onRowClick={openDetail} initialSort={{ key: "score", dir: "desc" }} />
          )}
        </>
      )}

      {/* CHALLENGE */}
      {!loading && !error && tab === "challenge" && <BacktestPanel backtest={backtest} />}

      <footer style={{ marginTop: 32, border: "1px solid var(--border-color)", borderRadius: 8, padding: 16, fontSize: "0.8em", color: "var(--text-muted)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text-main)" }}>Comment lire ces signaux ?</strong> Trois horizons — court (5 j, +1 %),
        moyen (20 j, +2 %), long (60 j, +4 %) —, chacun son modèle. Le score /10 traduit la probabilité calibrée d'atteindre
        la cible. Signaux <strong style={{ color: "var(--text-main)" }}>relatifs</strong> à la séance : « Achat Fort » = top ~10 %,
        « Achat Modéré » top ~25 %, « Vente » bas ~10 %, avec planchers/plafonds de probabilité. Le Challenge juge chaque
        prédiction en <strong style={{ color: "var(--text-main)" }}>trois modalités</strong> (réussi / partiel / manqué).
        Ceci n'est pas un conseil en investissement.
      </footer>
    </div>
  );
}
