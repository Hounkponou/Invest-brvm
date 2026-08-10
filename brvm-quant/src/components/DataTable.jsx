/**
 * DataTable — table de données générique et TRIABLE (paradigme « terminal »).
 * ---------------------------------------------------------------------------
 * Remplace les grilles de cartes/jauges/pastilles par une vraie table alignée.
 * Clic sur un en-tête : tri croissant -> décroissant -> aucun. Réutilisée par le
 * Screener, le Dashboard et les Signaux.
 *
 * Props :
 *   - columns : [{ key, label, align:'left'|'num', type:'num'|'str', accessor?,
 *                  render?(row), hideSm? }]
 *   - rows    : tableau d'objets
 *   - onRowClick(row)
 *   - initialSort : { key, dir:'asc'|'desc' } (optionnel)
 */
import React, { useMemo, useState } from "react";

const scoreCol = (s) => (s >= 7 ? "var(--up-color)" : s <= 4 ? "var(--down-color)" : "var(--warn-color)");

/** Barre de score 0-10 (10 segments) — remplace la jauge demi-cercle. */
export function ScoreBar({ score }) {
  const s = Math.max(0, Math.min(10, Number(score) || 0));
  const col = scoreCol(s);
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

export default function DataTable({ columns, rows, onRowClick, initialSort = null }) {
  const [sort, setSort] = useState(initialSort);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const acc = col.accessor || ((r) => r[col.key]);
    const arr = [...rows].sort((a, b) => {
      let va = acc(a), vb = acc(b);
      if (col.type === "num") {
        va = Number(va); vb = Number(vb);
        if (Number.isNaN(va)) va = -Infinity;
        if (Number.isNaN(vb)) vb = -Infinity;
        return va - vb;
      }
      return String(va ?? "").localeCompare(String(vb ?? ""), "fr");
    });
    return sort.dir === "desc" ? arr.reverse() : arr;
  }, [rows, sort, columns]);

  // Cycle : asc -> desc -> aucun.
  const toggle = (key) =>
    setSort((s) => (s && s.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));

  const arrow = (key) => (sort && sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  return (
    <div className="market-table-wrap">
      <table className="market-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`${c.align === "num" ? "mt-num" : "mt-left"}${c.hideSm ? " mt-hide-sm" : ""}`}
                onClick={() => toggle(c.key)}
                style={{ cursor: "pointer", userSelect: "none", color: sort && sort.key === c.key ? "var(--text-main)" : undefined }}
                title="Trier"
              >
                {c.label}{arrow(c.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={row.id ?? row.symbole ?? i}
              onClick={() => onRowClick?.(row)}
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" ? onRowClick?.(row) : null)}
            >
              {columns.map((c) => (
                <td key={c.key} className={`${c.align === "num" ? "mt-num" : "mt-left"}${c.hideSm ? " mt-hide-sm" : ""}`}>
                  {c.render ? c.render(row) : (c.accessor ? c.accessor(row) : row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
