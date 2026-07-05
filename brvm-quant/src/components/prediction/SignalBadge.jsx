/**
 * SignalBadge — pastille colorée traduisant la force du signal.
 * -------------------------------------------------------------
 * "Achat Fort" (vert) / "Achat Modéré" (ambre) / "Conserver" (neutre).
 * Un petit indicateur de « force » (points remplis) renforce la lecture
 * instantanée. Couleurs pilotées par les tokens de thème.
 */
import React from "react";
import { getSignalMeta } from "../../utils/predictionHelpers";

export default function SignalBadge({ signal, size = "md" }) {
  const meta = getSignalMeta(signal);
  const dots = meta.strength >= 1 ? 3 : meta.strength >= 0.6 ? 2 : 1;

  const padding = size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-bold uppercase tracking-wide ${padding}`}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {/* Jauge de force en 3 points */}
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: i < dots ? meta.color : "currentColor", opacity: i < dots ? 1 : 0.25 }}
          />
        ))}
      </span>
      {meta.label}
    </span>
  );
}
