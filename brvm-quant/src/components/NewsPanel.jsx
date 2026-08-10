/**
 * NewsPanel — section « Actualités » du détail action.
 * ----------------------------------------------------
 * Affiche un résumé (Gemini) + la liste des titres récents (titre cliquable,
 * source, date). État vide clair. Données via Google Actualités (pipeline).
 *
 * Sécurité : les titres sont du TEXTE (échappé par React), jamais exécutés ;
 * les liens ouvrent la SOURCE d'origine en nouvel onglet (rel="noopener").
 */
import React from "react";

function relDate(d) {
  if (!d) return "";
  const days = Math.round((Date.now() - new Date(`${d}T00:00:00`).getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 31) return `il y a ${Math.round(days / 7)} sem`;
  return `il y a ${Math.round(days / 30)} mois`;
}

export default function NewsPanel({ news }) {
  const items = news?.items || [];
  const wrap = { background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 20, marginTop: 20 };

  return (
    <div style={wrap}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, color: "var(--text-main)" }}>Actualités</h3>
        <span style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>via Google Actualités</span>
      </div>

      {items.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: "0.9em", marginTop: 12 }}>
          Pas d'actualité récente pour ce titre.
        </div>
      ) : (
        <>
          {news.summary && (
            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "12px 14px", margin: "12px 0", fontSize: "0.9em", color: "var(--text-main)" }}>
              <span style={{ fontSize: "0.75em", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-blue)", marginRight: 8 }}>Résumé IA</span>
              {news.summary}
            </div>
          )}

          <ul style={{ listStyle: "none", margin: "8px 0 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((it, i) => (
              <li key={i} style={{ borderTop: i ? "1px solid var(--border-color)" : "none", paddingTop: i ? 12 : 0 }}>
                <a href={it.link} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--text-main)", fontWeight: 600, textDecoration: "none", lineHeight: 1.4 }}>
                  {it.title}
                </a>
                <div style={{ fontSize: "0.78em", color: "var(--text-muted)", marginTop: 3 }}>
                  {it.source || "Source"}{it.date ? ` · ${relDate(it.date)}` : ""}
                </div>
              </li>
            ))}
          </ul>

          <div style={{ fontSize: "0.72em", color: "var(--text-muted)", marginTop: 14 }}>
            Les liens ouvrent le site source d'origine (contenu externe).
          </div>
        </>
      )}
    </div>
  );
}
