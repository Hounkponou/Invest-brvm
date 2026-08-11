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
      {/* En-tête + bascule de lentille */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, borderBottom: "2px solid var(--border-color)", paddingBottom: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--text-main)" }}>Analyse du marché</h2>
          <div style={{ fontSize: "0.85em", color: "var(--text-muted)", marginTop: 2 }}>{active.hint}</div>
        </div>
        <div style={{ display: "inline-flex", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" }}>
          {LENSES.map((l) => (
            <button key={l.key} type="button" onClick={() => setLens(l.key)}
              style={{ border: "none", cursor: "pointer", padding: "8px 16px", fontSize: "0.9em", fontWeight: 700,
                background: lens === l.key ? "var(--accent-blue)" : "transparent", color: lens === l.key ? "#fff" : "var(--text-muted)" }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {lens === "fondamentaux" ? <Screener embedded /> : <Predictions embedded />}
    </div>
  );
}
