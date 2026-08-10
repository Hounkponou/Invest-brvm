/**
 * MarketTable — liste marché en TABLE DENSE TRIABLE (Screener, Dashboard).
 * Habille DataTable avec les colonnes du marché. Clic en-tête = tri.
 */
import React, { useMemo } from "react";
import DataTable, { ScoreBar } from "./DataTable";
import { getValColor } from "../utils/uiHelpers";

const LIQ_COLOR = { Liquide: "var(--up-color)", "Peu liquide": "var(--warn-color)", Illiquide: "var(--down-color)" };
const LIQ_RANK = { Liquide: 3, "Peu liquide": 2, Illiquide: 1 };

export default function MarketTable({ items = [], onSelect, riskBySymbol = {}, initialSort = { key: "score_ia", dir: "desc" }, compact = false }) {
  const columns = useMemo(() => ([
    {
      key: "symbole", label: "Titre", align: "left", type: "str",
      render: (r) => (<><span className="mt-sym">{r.symbole}</span><span className="mt-nom">{r.nom}</span></>),
    },
    { key: "close", label: "Cours", align: "num", type: "num",
      render: (r) => (<>{r.close?.toLocaleString("fr-FR")}<span className="mt-unit"> F</span></>) },
    {
      key: "variation", label: "Var.", align: "num", type: "num",
      render: (r) => {
        const up = (r.variation ?? 0) >= 0;
        return <span style={{ color: up ? "var(--up-color)" : "var(--down-color)", fontWeight: 600 }}>{up ? "▲" : "▼"} {up ? "+" : ""}{r.variation}%</span>;
      },
    },
    { key: "score_ia", label: "Score", align: "left", type: "num", render: (r) => <ScoreBar score={r.score_ia} /> },
    {
      key: "statut_valorisation", label: "Valorisation", align: "left", type: "str", hideSm: true,
      render: (r) => <span style={{ color: getValColor(r.statut_valorisation), fontWeight: 600 }}>{r.statut_valorisation || "—"}</span>,
    },
    {
      key: "rendement_dividende", label: "Rendt", align: "num", type: "num", hideSm: true,
      render: (r) => <span style={{ color: (r.rendement_dividende || 0) >= 7 ? "var(--accent-blue)" : "var(--text-main)" }}>{r.rendement_dividende ? `${r.rendement_dividende}%` : "—"}</span>,
    },
    { key: "per", label: "PER", align: "num", type: "num", hideSm: true,
      render: (r) => (Number(r.per) > 0 ? `${Number(r.per).toFixed(1)}×` : "—") },
    {
      key: "liquidity", label: "Liquidité", align: "left", type: "num", hideSm: true,
      accessor: (r) => LIQ_RANK[riskBySymbol[r.symbole]?.liquidity?.level] || 0,
      render: (r) => {
        const lvl = riskBySymbol[r.symbole]?.liquidity?.level;
        return <span style={{ color: LIQ_COLOR[lvl] || "var(--text-muted)", fontWeight: 600 }}>{lvl || "—"}</span>;
      },
    },
  ].filter((c) => !compact || ["symbole", "close", "variation", "score_ia"].includes(c.key))), [riskBySymbol, compact]);

  return <DataTable columns={columns} rows={items} onRowClick={onSelect} initialSort={initialSort} />;
}
