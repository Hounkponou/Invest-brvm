/**
 * Predictions.jsx — LE MODULE PRÉDICTIF (page intégrée au Layout).
 * ================================================================
 * Vue dédiée exclusivement à la partie prédictive du modèle XGBoost.
 * Elle assemble les composants modulaires et gère :
 *   - le chargement des données (hook usePredictions) ;
 *   - deux onglets : « Signaux du jour » et « Challenge » (backtest) ;
 *   - un filtre rapide sur la force du signal.
 *
 * COHÉRENCE : cette page n'est PLUS autonome. Elle est rendue à l'intérieur
 * du <Layout> commun (même Sidebar, même TopHeader, même thème Dark/Solar).
 *   - le thème est piloté globalement (bouton dans le TopHeader) → on retire
 *     le ThemeToggle local ;
 *   - la recherche et le filtre secteur viennent du TopHeader via
 *     useOutletContext() → les mêmes filtres que Dashboard / Screener.
 *
 * Design : mobile-first (empilement vertical par défaut, grille sur écrans
 * larges), espacements généreux, typographie lisible, couleurs via tokens.
 */
import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import usePredictions from "../hooks/usePredictions";
import useGeminiRecos from "../hooks/useGeminiRecos";
import useSeasonality from "../hooks/useSeasonality";
import PredictionCard from "../components/prediction/PredictionCard";
import BacktestPanel from "../components/prediction/BacktestPanel";
import StatCard from "../components/prediction/StatCard";
import GeminiRecoPanel from "../components/prediction/GeminiRecoPanel";
import { FilterChips } from "../components/filters";
import { getSector } from "../utils/brvmConfig";
import { computeBacktest, getSignal, getScore10, getGeminiScore10 } from "../utils/predictionHelpers";

// Options de filtre sur la force du signal
const FILTERS = [
  { key: "all", label: "Tous" },
  { key: "Achat Fort", label: "Achat Fort" },
  { key: "Achat Modéré", label: "Achat Modéré" },
];

export default function Predictions() {
  // Filtres GLOBAUX partagés (recherche + secteur), fournis par le Layout.
  // On sécurise avec des valeurs par défaut au cas où le contexte est absent.
  const { searchQuery = "", globalSector = "All", marketData = [] } = useOutletContext() || {};

  const { live, closed, latestDate, loading, error, refetch } = usePredictions();
  // Recommandations Gemini du jour, indexées par symbole (dégrade proprement si absent).
  const { bySymbol: geminiBySymbol } = useGeminiRecos();
  // Saisonnalité du mois par titre (facteur quantitatif nouveau, sans Gemini).
  const { bySymbol: seasonBySymbol } = useSeasonality();

  const [tab, setTab] = useState("signals"); // "signals" | "challenge"
  const [filter, setFilter] = useState("all"); // force du signal (filtre local)
  const [sortMode, setSortMode] = useState("modele"); // "modele" | "ia"

  // Accès O(1) aux fondamentaux marché par symbole (justification du score).
  const marketBySymbol = useMemo(() => {
    const m = {};
    (marketData || []).forEach((d) => { if (d?.symbole) m[d.symbole] = d; });
    return m;
  }, [marketData]);

  // Backtest dérivé des prédictions clôturées (mémoïsé)
  const backtest = useMemo(() => computeBacktest(closed), [closed]);

  // Signaux du jour filtrés : force du signal + recherche + secteur (globaux)
  const filteredLive = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return live.filter((p) => {
      // 1. Force du signal (filtre local)
      if (filter !== "all" && getSignal(p) !== filter) return false;
      // 2. Recherche texte (symbole ou nom) — filtre global du TopHeader
      if (q) {
        const hay = `${p.symbole ?? ""} ${p.nom ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // 3. Secteur — filtre global du TopHeader
      if (globalSector !== "All" && getSector(p.symbole) !== globalSector) return false;
      return true;
    });
  }, [live, filter, searchQuery, globalSector]);

  // Tri selon le FILTRE choisi : « Modèle » (score quantitatif) ou « IA » (avis
  // Gemini). En mode IA, les titres sans avis passent en fin de liste.
  const sortedLive = useMemo(() => {
    const rows = [...filteredLive];
    if (sortMode === "ia") {
      rows.sort((a, b) => {
        const sa = getGeminiScore10(geminiBySymbol[a.symbole]);
        const sb = getGeminiScore10(geminiBySymbol[b.symbole]);
        return (sb ?? -1) - (sa ?? -1);
      });
    } else {
      rows.sort((a, b) => getScore10(b) - getScore10(a));
    }
    return rows;
  }, [filteredLive, sortMode, geminiBySymbol]);

  // Y a-t-il au moins un avis Gemini disponible ? (sinon, note en mode « Filtre IA »)
  const hasGemini = useMemo(() => Object.keys(geminiBySymbol || {}).length > 0, [geminiBySymbol]);

  // Compteurs pour les KPI (sur l'ensemble du jour, avant filtre local)
  const counts = useMemo(() => {
    let fort = 0;
    let modere = 0;
    live.forEach((p) => {
      const s = getSignal(p);
      if (s === "Achat Fort") fort += 1;
      else if (s === "Achat Modéré") modere += 1;
    });
    return { fort, modere, total: live.length };
  }, [live]);

  return (
    <div className="w-full">
      {/* ================= EN-TÊTE (thème géré par le TopHeader) ============ */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-fg sm:text-3xl">
            Module Prédictif <span className="text-accent">IA</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Signaux XGBoost à 15 jours
            {latestDate ? ` • séance du ${latestDate}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={refetch}
          className="self-start rounded-full border border-border bg-surface px-4 py-2 text-sm
                     font-semibold text-fg transition hover:bg-surface2"
        >
          Actualiser
        </button>
      </header>

      {/* ================= KPI SYNTHÈSE ================= */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Signaux du jour" value={counts.total} accent="var(--ipx-accent)" />
        <StatCard label="Achat Fort" value={counts.fort} accent="var(--ipx-up)" />
        <StatCard label="Achat Modéré" value={counts.modere} accent="var(--ipx-warn)" />
        <StatCard
          label="Fiabilité (backtest)"
          value={backtest.total ? `${backtest.hitRate} %` : "—"}
          accent="var(--ipx-fg)"
        />
      </div>

      {/* ================= ONGLETS ================= */}
      <div className="mb-6 inline-flex rounded-full border border-border bg-surface p-1">
        {[
          { key: "signals", label: "Signaux du jour" },
          { key: "challenge", label: "Challenge" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? "text-fg" : "text-muted hover:text-fg"
            }`}
            style={tab === t.key ? { backgroundColor: "var(--ipx-surface-2)" } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ================= ÉTATS GLOBAUX ================= */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 150, borderRadius: 16 }} />
          ))}
        </div>
      )}
      {error && !loading && (
        <div
          className="rounded-2xl border p-6 text-center text-sm"
          style={{ borderColor: "var(--ipx-down)", color: "var(--ipx-down)" }}
        >
          {error}
        </div>
      )}

      {/* ================= CONTENU : SIGNAUX ================= */}
      {!loading && !error && tab === "signals" && (
        <>
          {/* Barre de contrôle : tri Modèle/IA + filtres de force du signal */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-border bg-surface p-1">
              {[
                { key: "modele", label: "Filtre Modèle" },
                { key: "ia", label: "Filtre IA" },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSortMode(m.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    sortMode === m.key ? "text-fg" : "text-muted hover:text-fg"
                  }`}
                  style={sortMode === m.key ? { backgroundColor: "var(--ipx-surface-2)" } : undefined}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
          </div>

          {sortMode === "ia" && !hasGemini && (
            <div className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
              Les avis de l'IA (Gemini) sont indisponibles pour l'instant — le tri « Filtre IA »
              reprend l'ordre du modèle. Le classement redeviendra qualitatif dès que les
              recommandations seront régénérées.
            </div>
          )}

          {sortedLive.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted">
              Aucun signal ne correspond à ces filtres.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {sortedLive.map((pred) => (
                <div key={`${pred.date_prediction}-${pred.symbole}`} className="flex flex-col gap-2">
                  <PredictionCard
                    pred={pred}
                    sector={getSector(pred.symbole)}
                    market={marketBySymbol[pred.symbole]}
                    gemini={geminiBySymbol[pred.symbole]}
                    season={seasonBySymbol[pred.symbole]}
                  />
                  {/* Avis Gemini textuel + contrôle croisé (rendu seulement s'il existe) */}
                  <GeminiRecoPanel gemini={geminiBySymbol[pred.symbole]} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ================= CONTENU : CHALLENGE ================= */}
      {!loading && !error && tab === "challenge" && <BacktestPanel backtest={backtest} />}

      {/* ================= NOTE PÉDAGOGIQUE ================= */}
      <footer className="mt-10 rounded-2xl border border-border bg-surface p-4 text-xs text-muted">
        <strong className="text-fg">Comment lire ces signaux ?</strong> Le score sur 10
        traduit la probabilité, calibrée par le modèle, que le titre progresse d'au moins
        2 % dans les 15 prochains jours. Les signaux sont <strong className="text-fg">relatifs</strong> :
        chaque séance, « Achat Fort » distingue les meilleures opportunités du jour (top ~10 %)
        et « Achat Modéré » le top ~25 %, avec un plancher de probabilité pour ne jamais
        survendre un titre peu convaincant. Le Challenge juge chaque prédiction arrivée à terme en
        <strong className="text-fg"> trois modalités</strong> : <em>réussi</em> (objectif atteint),
        <em> partiel</em> (bon sens, mais objectif non atteint) et <em>manqué</em> (mauvais sens).
        Ceci n'est pas un conseil en investissement.
      </footer>
    </div>
  );
}
