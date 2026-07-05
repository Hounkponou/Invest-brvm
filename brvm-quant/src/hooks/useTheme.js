/**
 * useTheme — gestion du thème « Dark / Solar » du Module Prédictif.
 * -----------------------------------------------------------------
 * Logique :
 *   - source de vérité = attribut data-theme sur <html> ;
 *   - persistance dans localStorage (clé "ipx_theme") ;
 *   - au premier rendu, on respecte le choix mémorisé, sinon la préférence
 *     système (prefers-color-scheme), sinon "dark" par défaut ;
 *   - le basculement est instantané (simple mutation d'attribut = cascade CSS,
 *     aucun re-render coûteux).
 *
 * Retour : { theme, isDark, isSolar, toggleTheme, setTheme }
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ipx_theme";
const THEMES = ["dark", "solar"];

/** Détermine le thème initial sans provoquer de « flash » de couleur. */
function getInitialTheme() {
  if (typeof window === "undefined") return "dark";

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && THEMES.includes(saved)) return saved;

  // Préférence système : un utilisateur en clair démarre en mode Solar
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return prefersLight ? "solar" : "dark";
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Applique le thème au <html> + persiste, à chaque changement
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "solar" : "dark"));
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    isSolar: theme === "solar",
    toggleTheme,
    setTheme,
  };
}

export default useTheme;
