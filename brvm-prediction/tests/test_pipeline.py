"""
Tests de la LOGIQUE PURE du pipeline (aucun réseau, aucun secret réel).

Couvre les briques dont une régression casserait silencieusement la production :
  - dérivations upsert (score/10, signal, validation stricte, erreurs de schéma) ;
  - validation croisée purgée (anti-fuite sur données de panel) ;
  - winsorisation sans fuite look-ahead ;
  - dérivations Gemini (normalisation, parsing JSON, sentiment marché, batch).
"""

import numpy as np
import pandas as pd

from scripts.upsert_predictions import (  # noqa: E402
    proba_to_score_10, proba_to_signal, build_records, _is_schema_error,
)
from core.validation import PurgedKFold  # noqa: E402
from core.features_enhanced import _winsorize  # noqa: E402
from core.gemini_reco import (  # noqa: E402
    _normalize_reco, _parse_json, compute_market_sentiment, _call_gemini_batch,
)
from core.scrape_dividendes import (  # noqa: E402
    _parse_amount, _parse_fr_date, latest_dividend_per_symbol,
)
from core.export_artifacts import _inject_rendement  # noqa: E402
from core.seasonality import (  # noqa: E402
    compute_seasonality, add_seasonality_features, _build_entry,
)


# --------------------------------------------------------------------------- upsert
def test_proba_to_score_10_bornes():
    assert proba_to_score_10(0.0) == 0
    assert proba_to_score_10(1.0) == 10
    assert proba_to_score_10(0.82) == 8
    assert proba_to_score_10(2.0) == 10  # borné


def test_proba_to_signal_seuils():
    assert proba_to_signal(0.80) == "Achat Fort"
    assert proba_to_signal(0.60) == "Achat Modéré"
    assert proba_to_signal(0.40) == "Conserver"


def test_build_records_rejette_lignes_invalides():
    demo = pd.DataFrame({
        "date": ["2026-07-03"] * 5,
        "symbole": ["SGBC", "   ", None, np.nan, "ORAC"],  # 3 invalides
        "close": [12500, 3400, 3400, 3400, 3400],
        "probabilite": [0.82, 0.61, 0.61, 0.61, 0.61],
    })
    res = build_records(demo)
    assert [r["symbole"] for r in res.records] == ["SGBC", "ORAC"]
    assert len(res.skipped) == 3


def test_build_records_rejette_prix_et_proba_hors_bornes():
    demo = pd.DataFrame({
        "date": ["2026-07-03"] * 2,
        "symbole": ["AAA", "BBB"],
        "close": [0, 100],           # AAA prix invalide
        "probabilite": [0.5, 1.4],   # BBB proba hors [0,1]
    })
    res = build_records(demo)
    assert res.records == []


def test_is_schema_error():
    assert _is_schema_error(Exception("PGRST204 could not find column"))
    assert _is_schema_error(Exception("42P10 no unique or exclusion constraint"))
    assert not _is_schema_error(Exception("statement timeout 57014"))


# --------------------------------------------------------------------------- validation
def test_purged_kfold_purge_en_seances():
    # Panel : 10 séances x 3 titres, l'axe temporel doit purger EN SÉANCES.
    time_groups = np.repeat(np.arange(10), 3)
    X = np.zeros((len(time_groups), 2))
    cv = PurgedKFold(n_splits=5, horizon=2, embargo=1)
    folds = list(cv.split(X, groups=time_groups))
    assert len(folds) == 5
    for tr, te in folds:
        te_sessions = set(time_groups[te])
        tr_sessions = set(time_groups[tr])
        # Aucune séance d'entraînement à moins de `horizon` séances du test (purge).
        lo, hi = min(te_sessions), max(te_sessions)
        for s in tr_sessions:
            assert s < lo - 2 or s > hi + 2


# --------------------------------------------------------------------------- features
def test_winsorize_sans_fuite():
    # Deux extrêmes "futurs" hors du masque d'entraînement ne doivent PAS fixer les bornes.
    s = pd.Series(np.r_[np.arange(100), [10000, -9999]].astype(float))
    mask = pd.Series([True] * 100 + [False, False])
    w = _winsorize(s, fit_mask=mask)
    assert w.max() < 200      # borne calée sur le train, pas sur 10000
    assert w.min() > -100


# --------------------------------------------------------------------------- gemini
def test_normalize_reco():
    assert _normalize_reco("je conseille un ACHAT FORT") == "Achat fort"
    assert _normalize_reco("acheter") == "Achat modéré"
    assert _normalize_reco("vendre maintenant") == "Vente"
    assert _normalize_reco("garder") == "Conservation"


def test_parse_json_tolere_markdown():
    d = _parse_json('```json\n{"a": 1, "b": {"c": 2}}\n```')
    assert d == {"a": 1, "b": {"c": 2}}
    assert _parse_json("pas de json ici") == {}


def test_compute_market_sentiment():
    haussier = pd.DataFrame({"date": pd.to_datetime(["2026-07-17"] * 3),
                             "variation": [2.0, 1.0, -0.1]})
    baissier = pd.DataFrame({"date": pd.to_datetime(["2026-07-17"] * 3),
                             "variation": [-2.0, -1.0, 0.1]})
    assert compute_market_sentiment(haussier) == "Haussier"
    assert compute_market_sentiment(baissier) == "Baissier"
    assert compute_market_sentiment(None) == "Neutre"


def test_call_gemini_batch_parse():
    class _Resp:
        text = ('{"SGBC": {"recommandation":"achat modéré","justification":"x",'
                '"sentiment_web":"Positif"}, "BOAC": {"recommandation":"vendre",'
                '"justification":"y","sentiment_web":"Négatif"}}')
        candidates = []

    class _Models:
        def generate_content(self, model, contents, config):
            return _Resp()

    class _Client:
        models = _Models()

    items = [{"symbole": "SGBC", "nom": "a", "analyse": "z"},
             {"symbole": "BOAC", "nom": "b", "analyse": "z"}]
    out = _call_gemini_batch(_Client(), items, "Neutre")
    assert out["SGBC"]["recommandation"] == "Achat modéré"
    assert out["BOAC"]["recommandation"] == "Vente"


# --------------------------------------------------------------------------- dividendes
def test_parse_amount_fr():
    assert _parse_amount("1 707,2 FCFA") == 1707.2
    assert _parse_amount("420 FCFA") == 420.0
    assert _parse_amount("768,16 FCFA") == 768.16
    assert _parse_amount(None) is None


def test_parse_fr_date():
    assert _parse_fr_date("7 septembre 2026") == "2026-09-07"
    assert _parse_fr_date("13 août 2026") == "2026-08-13"
    assert _parse_fr_date("n/a") is None


def test_latest_dividend_per_symbol():
    df = pd.DataFrame({
        "emetteur": ["SONATEL", "SONATEL", "ORANGE CI"],
        "exercice": pd.array([2024, 2025, 2025], dtype="Int64"),
        "montant_net": [1000.0, 1740.0, 800.0],
    })
    out = latest_dividend_per_symbol(df).set_index("symbole")
    assert out.loc["SNTS", "dividende_net"] == 1740.0   # exercice le plus récent
    assert out.loc["SNTS", "exercice"] == 2025
    assert out.loc["ORAC", "dividende_net"] == 800.0


def test_inject_rendement_plafond():
    records = [
        {"symbole": "AAA", "close": 8000},   # 400/8000 = 5%
        {"symbole": "BBB", "close": 1000},   # 900/1000 = 90% -> anomalie -> None
        {"symbole": "CCC", "close": 5000},   # pas de dividende -> None
    ]
    _inject_rendement(records, {"AAA": 400.0, "BBB": 900.0})
    assert records[0]["rendement_dividende"] == 5.0
    assert records[1]["rendement_dividende"] is None   # plafonné (>30%)
    assert records[2]["rendement_dividende"] is None


# --------------------------------------------------------------------------- saisonnalité
def _synthetic_history():
    """3 titres, 2018->2026, avec un vrai biais d'août pour AAAA (+) et BBBB (-)."""
    rng = pd.bdate_range("2018-01-01", "2026-08-07")
    rows = []
    rs = np.random.RandomState(0)
    for sym, boost in [("AAAA", +0.004), ("BBBB", -0.004), ("CCCC", 0.0)]:
        price = 1000.0
        for dt in rng:
            seasonal = boost if dt.month == 8 else 0.0
            price *= (1 + 0.0002 + seasonal + rs.normal(0, 0.008))
            rows.append({"symbole": sym, "date": dt, "close": round(price, 2)})
    return pd.DataFrame(rows)


def test_compute_seasonality_directions():
    res = compute_seasonality(_synthetic_history())
    # Mois courant = août : AAAA doit ressortir haussier (+), BBBB baissier (-).
    assert res["AAAA"]["season_dir"] == "haussier"
    assert res["AAAA"]["tilt"] == 1
    assert res["BBBB"]["season_dir"] == "baissier"
    assert res["BBBB"]["tilt"] == -1
    # Le libellé mentionne le mois (transparence pour l'utilisateur).
    assert "août" in res["AAAA"]["season_label"]


def test_seasonality_features_anti_fuite():
    """La feature de saisonnalité ne doit voir QUE les années antérieures."""
    df = _synthetic_history().sort_values(["symbole", "date"]).reset_index(drop=True)
    cols = add_seasonality_features(df)
    assert set(cols) == {"month_sin", "month_cos", "hist_month_fwd_ret", "hist_month_pos_rate"}

    d = pd.to_datetime(df["date"])
    aug = df[(df["symbole"] == "AAAA") & (d.dt.month == 8)].copy()
    aug["year"] = pd.to_datetime(aug["date"]).dt.year
    by_year = aug.groupby("year")["hist_month_fwd_ret"].first()
    # 1re année d'août : aucune année antérieure -> NaN (preuve d'anti-fuite).
    assert pd.isna(by_year.loc[by_year.index.min()])
    # Années suivantes renseignées ET l'année COURANTE (2026, non réalisée) aussi.
    assert by_year.loc[2026] == by_year.loc[2026]  # non-NaN
    assert by_year.dropna().mean() > 0             # reflète bien le boost d'août


def test_tilt_score_borne():
    from scripts.upsert_predictions import _tilt_score
    assert _tilt_score(0.62, +1) == 7   # base 6 + 1
    assert _tilt_score(0.62, -1) == 5
    assert _tilt_score(1.0, +1) == 10   # borné en haut
    assert _tilt_score(0.0, -1) == 0    # borné en bas


def test_relative_signal_rang_et_plancher():
    from scripts.upsert_predictions import relative_signal, _quantile
    # Jour MÉDIOCRE : max 0.44 -> le plancher empêche tout « Achat » abusif.
    faibles = sorted([0.30, 0.35, 0.40, 0.42, 0.44])
    p90, p75 = _quantile(faibles, 0.90), _quantile(faibles, 0.75)
    assert relative_signal(0.44, p90, p75) == "Conserver"  # meilleur du jour mais < plancher
    # Jour FRANC : quelques titres bien au-dessus -> top ~10 % = Achat Fort,
    # top ~25 % = Achat Modéré (seuils = centiles de la séance, ici ~0.71 / ~0.66).
    forts = sorted([0.40, 0.45, 0.50, 0.55, 0.62, 0.70, 0.72])
    p90, p75 = _quantile(forts, 0.90), _quantile(forts, 0.75)
    assert relative_signal(0.72, p90, p75) == "Achat Fort"     # >= 90e centile
    assert relative_signal(0.70, p90, p75) == "Achat Modéré"   # entre 75e et 90e
    assert relative_signal(0.62, p90, p75) == "Conserver"      # sous le 75e centile
    assert relative_signal(0.40, p90, p75) == "Conserver"
