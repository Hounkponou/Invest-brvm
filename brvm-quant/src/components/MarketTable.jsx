/**
 * MarketTable — liste marché en TABLE DENSE (paradigme « terminal de données »).
 * ---------------------------------------------------------------------------
 * Remplace la grille de cartes arrondies (le look « template ») : colonnes
 * alignées, chiffres tabulaires, barre de score inline (pas de jauge demi-cercle),
 * statuts en TEXTE coloré (pas de pastilles). Une ligne = un titre, clic -> détail.
 */
import React from "react";
import { getValColor } from "../utils/uiHelpers";
import { getSector } from "../utils/brvmConfig";

const scoreColor = (s) => (s >= 7 ? "var(--up-color)" : s <= 4 ? "var(--down-color)" : "var(--warn-color)");
const LIQ_COLOR = { Liquide: "var(--up-color)", "Peu liquide": "var(--warn-color)", Illiquide: "var(--down-color)" };

/** Barre de score 0-10 : 10 segments, remplis selon le score. Remplace la jauge. */
function ScoreBar({ score }) {
  const s = Math.max(0, Math.min(10, Number(score) || 0));
  const col = scoreColor(s);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-flex", gap: 1.5 }} aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} style={{ width: 4, height: 12, background: i < s ? col : "var(--border-color)", opacity: i < s ? 1 : 0.5 }} />
        ))}
      </span>
      <span style={{ fontWeight: 700, color: col, fontVariantNumeric: "tabular-nums" }}>{s}</span>
    </span>
  );
}

export default function MarketTable({ items = [], onSelect, riskBySymbol = {}, sectorPerStats = {} }) {
  return (
    <div className="market-table-wrap">
      <table className="market-table">
        <thead>
          <tr>
            <th className="mt-left">Titre</th>
            <th className="mt-num">Cours</th>
            <th className="mt-num">Var.</th>
            <th className="mt-left">Score</th>
            <th className="mt-left mt-hide-sm">Valorisation</th>
            <th className="mt-num mt-hide-sm">Rendt</th>
            <th className="mt-num mt-hide-sm">PER</th>
            <th className="mt-left mt-hide-sm">Liquidité</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const up = (it.variation ?? 0) >= 0;
            const liq = riskBySymbol[it.symbole]?.liquidity?.level;
            const per = Number(it.per);
            return (
              <tr key={it.symbole} onClick={() => onSelect?.(it)} tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" ? onSelect?.(it) : null)}>
                <td className="mt-left">
                  <span className="mt-sym">{it.symbole}</span>
                  <span className="mt-nom">{it.nom}</span>
                </td>
                <td className="mt-num">{it.close?.toLocaleString("fr-FR")}<span className="mt-unit"> F</span></td>
                <td className="mt-num" style={{ color: up ? "var(--up-color)" : "var(--down-color)", fontWeight: 600 }}>
                  {up ? "▲" : "▼"} {up ? "+" : ""}{it.variation}%
                </td>
                <td className="mt-left"><ScoreBar score={it.score_ia} /></td>
                <td className="mt-left mt-hide-sm" style={{ color: getValColor(it.statut_valorisation), fontWeight: 600 }}>
                  {it.statut_valorisation || "—"}
                </td>
                <td className="mt-num mt-hide-sm" style={{ color: (it.rendement_dividende || 0) >= 7 ? "var(--accent-blue)" : "var(--text-main)" }}>
                  {it.rendement_dividende ? `${it.rendement_dividende}%` : "—"}
                </td>
                <td className="mt-num mt-hide-sm">{per > 0 ? `${per.toFixed(1)}×` : "—"}</td>
                <td className="mt-left mt-hide-sm" style={{ color: LIQ_COLOR[liq] || "var(--text-muted)", fontWeight: 600 }}>
                  {liq || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
