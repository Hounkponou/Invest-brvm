/**
 * SeasonalityBadge — biais saisonnier du mois pour un titre.
 * ----------------------------------------------------------
 * Nouveau facteur quantitatif : « ce titre est-il historiquement porteur au
 * mois courant ? ». Flèche + libellé court, détail complet au survol (title).
 * Rendu null si aucune donnée de saisonnalité (dégradation propre).
 */
import React from "react";
import { getSeasonMeta } from "../../utils/predictionHelpers";

export default function SeasonalityBadge({ season, size = "md" }) {
  if (!season) return null;
  const meta = getSeasonMeta(season);
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      title={season.season_label || meta.label}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding}`}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span aria-hidden="true">{meta.arrow}</span>
      Saisonnalité {meta.dir}
    </span>
  );
}
