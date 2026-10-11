/**
 * Market — page d'ANALYSE unifiée, une table, DEUX LENTILLES :
 *   - Fondamentaux : le Screener (valorisation, rendement, PER, liquidité, prix) ;
 *   - Signaux IA   : les prédictions XGBoost multi-horizons + Challenge.
 * Même coquille, même modale de détail. Supprime le doublon Screener/Signaux.
 */
import React, { useState } from "react";
import Screener from "./Screener";
import Predictions from "./Predictions";

const LENSES = [
  { key: "fondamentaux", label: "Fondamentaux", hint: "Valorisation, rendement, PER, liquidité, prix" },
  { key: "signaux", label: "Signaux IA", hint: "Prédictions XGBoost multi-horizons + Challenge" },
];

export default function Market() {
  const [lens, setLens] = useState("fondamentaux");
  const active = LENSES.find((l) => l.key === lens) || LENSES[0];

  return (
    <div>
      {/* Bandeau éditorial + onglets de lentille */}
      <header className="dash-masthead">
        <div>
          <div className="dash-kicker">Analyse · {active.label}</div>
          <h2 className="dash-title">Analyse du marché</h2>
          <div className="dash-subhint">{active.hint}</div>
        </div>
        <div className="lens-tabs" role="tablist">
          {LENSES.map((l) => (
            <button
              key={l.key}
              type="button"
              role="tab"
              aria-selected={lens === l.key}
              onClick={() => setLens(l.key)}
              className={`lens-tab${lens === l.key ? " active" : ""}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      {lens === "fondamentaux" ? <Screener embedded /> : <Predictions embedded />}
    </div>
  );
}
