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
import { computeBacktest, getSignal, getScore10, getGeminiScore10, HORIZONS } from "../utils/predictionHelpers";

// Options de filtre sur le TYPE de signal (4 modalités).
const FILTERS = [
  { key: "all", label: "Tous" },
  { key: "Achat Fort", label: "Achat Fort" },
  { key: "Achat Modéré", label: "Achat Modéré" },
  { key: "Conserver", label: "Conserver" },
  { key: "Vente", label: "Vente" },
];

// Sélecteur d'horizon (Court/Moyen/Long/Tous) — s'applique aux deux onglets.
const HORIZON_OPTIONS = [
  ...HORIZONS.map((h) => ({ key: h.days, label: h.short })),
  { key: "all", label: "Tous" },
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
  const [filter, setFilter] = useState("all"); // type de signal (filtre local)
  const [sortMode, setSortMode] = useState("modele"); // "modele" | "ia"
  const [horizon, setHorizon] = useState(20); // 5 | 20 | 60 | "all" (défaut moyen)

  // Accès O(1) aux fondamentaux marché par symbole (justification du score).
  const marketBySymbol = useMemo(() => {
    const m = {};
    (marketData || []).forEach((d) => { if (d?.symbole) m[d.symbole] = d; });
    return m;
  }, [marketData]);

  // Backtest dérivé des prédictions clôturées, FILTRÉ par l'horizon (harmonisé).
  const backtest = useMemo(
    () => computeBacktest(closed, horizon === "all" ? null : horizon),
    [closed, horizon]
  );

  // Signaux du jour filtrés : horizon + type de signal + recherche + secteur (globaux)
  const filteredLive = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return live.filter((p) => {
      // 0. Horizon sélectionné (Court/Moyen/Long ; "all" = tous les horizons)
      if (horizon !== "all" && Number(p.horizon_jours) !== Number(horizon)) return false;
      // 1. Type de signal (filtre local)
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
  }, [live, horizon, filter, searchQuery, globalSector]);

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

  // Compteurs KPI (4 modalités) pour l'HORIZON sélectionné, avant filtre local.
  const counts = useMemo(() => {
    const rows = horizon === "all"
      ? live
      : live.filter((p) => Number(p.horizon_jours) === Number(horizon));
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

  return (
    <div className="w-full">
      {/* ================= EN-TÊTE (thème géré par le TopHeader) ============ */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-fg sm:text-3xl">
            Module Prédictif <span className="text-accent">IA</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Signaux XGBoost multi-horizons (5 / 20 / 60 j)
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

      {/* ================= SÉLECTEUR D'HORIZON (commun aux 2 onglets) ======= */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Horizon</span>
        <div className="inline-flex rounded-full border border-border bg-surface p-1">
          {HORIZON_OPTIONS.map((h) => (
            <button
              key={h.key}
              type="button"
              onClick={() => setHorizon(h.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                horizon === h.key ? "text-fg" : "text-muted hover:text-fg"
              }`}
              style={horizon === h.key ? { backgroundColor: "var(--ipx-surface-2)" } : undefined}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= KPI SYNTHÈSE (4 modalités) ================= */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Signaux" value={counts.total} accent="var(--ipx-accent)" />
        <StatCard label="Achat Fort" value={counts.fort} accent="var(--ipx-up)" />
        <StatCard label="Achat Modéré" value={counts.modere} accent="var(--ipx-warn)" />
        <StatCard label="Conserver" value={counts.conserver} accent="var(--ipx-muted)" />
        <StatCard label="Vente" value={counts.vente} accent="var(--ipx-down)" />
        <StatCard
          label="Fiabilité"
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
        <strong className="text-fg">Comment lire ces signaux ?</strong> Trois horizons — court
        (5 j, cible +1 %), moyen (20 j, +2 %) et long (60 j, +4 %) —, chacun avec son propre
        modèle. Le score sur 10 traduit la probabilité calibrée d'atteindre la cible de l'horizon.
        Les signaux sont <strong className="text-fg">relatifs</strong> à la séance : « Achat Fort »
        = meilleures opportunités (top ~10 %), « Achat Modéré » le top ~25 %, « Vente » les moins
        bien classées (bas ~10 %), avec des planchers/plafonds de probabilité pour ne jamais
        survendre ni suracheter à tort. Le Challenge juge chaque prédiction arrivée à terme en
        <strong className="text-fg"> trois modalités</strong> : <em>réussi</em> (objectif atteint),
        <em> partiel</em> (bon sens, mais objectif non atteint) et <em>manqué</em> (mauvais sens).
        Ceci n'est pas un conseil en investissement.
      </footer>
    </div>
  );
}
