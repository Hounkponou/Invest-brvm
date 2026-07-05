/**
 * ThemeToggle — bouton de bascule Dark ⇄ Solar.
 * ----------------------------------------------
 * Composant purement présentational : reçoit l'état et l'action via props
 * (fournis par le hook useTheme) afin de rester réutilisable et testable.
 * Icônes SVG inline (pas de dépendance externe).
 */
import React from "react";

export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Activer le mode Solaire" : "Activer le mode Sombre"}
      title={isDark ? "Mode Solaire" : "Mode Sombre"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full
                 border border-border bg-surface text-fg transition
                 hover:bg-surface2 active:scale-95"
    >
      {isDark ? (
        /* Icône Soleil : proposer de passer en Solar */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41
                   M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        /* Icône Lune : proposer de passer en Dark */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
