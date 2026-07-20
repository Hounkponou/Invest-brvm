"""
core/gemini_reco.py
===================
Recommandation Gemini CLAIRE par action, pour la page « Signaux IA ».

Approche (batch, SANS Supabase) :
  1. On parcourt les actions de la dernière séance (df_market).
  2. Pour chacune, Gemini (avec recherche web) rend une recommandation nette
     — « Achat fort / Achat modéré / Conservation / Vente » — assortie d'une
     justification, EN TENANT COMPTE du marché, des informations web et de
     l'analyse quantitative interne (score, PER, RSI, variation).
  3. On écrit le tout dans un FICHIER JSON statique servi par le frontend
     (brvm-quant/public/gemini_recos.json) : aucune table Supabase nécessaire.

La clé API vit UNIQUEMENT côté serveur (GEMINI_API_KEY), jamais dans le frontend.

⚠️ Le nom du modèle et l'API du SDK `google-genai` peuvent évoluer : isolés dans
_call_gemini() et signalés par des commentaires.
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone

from core.config import GEMINI_API_KEY, BASE_DIR

# Fichier de sortie servi par le frontend (dossier public de l'app Vite).
OUTPUT_PATH = os.path.join(os.path.dirname(BASE_DIR), "brvm-quant", "public", "gemini_recos.json")

# Modèle Gemini (rapide). Alias "latest" = toujours un modèle Flash courant et
# disponible (gemini-2.5-flash a été retiré aux nouveaux comptes).
GEMINI_MODEL = "gemini-flash-latest"

# MODE LOTS (sans grounding) : une seule requête Gemini couvre BATCH_SIZE actions.
# ~47 titres / 18 = 3 requêtes -> très en dessous du quota gratuit (20 req/jour/modèle),
# donc on couvre TOUS les titres chaque jour. Sans grounding, regrouper ne dégrade
# pas la qualité (Gemini reçoit les données quantitatives de chaque action).
BATCH_SIZE = 18

# Recherche web (grounding Google Search) : INDISPONIBLE sur le palier gratuit
# (quota nul -> erreur 429). Laissé à False par défaut pour fonctionner en gratuit
# (la reco s'appuie alors sur les connaissances du modèle + le contexte fourni).
# Passe à True si tu actives un plan payant incluant le grounding.
USE_WEB_GROUNDING = False

# Recommandations autorisées (le frontend colore en fonction).
ALLOWED_RECOS = {"Achat fort", "Achat modéré", "Conservation", "Vente"}


# ---------------------------------------------------------------------------
# Sentiment de marché (proxy interne : largeur avancées/déclins du jour)
# ---------------------------------------------------------------------------
def compute_market_sentiment(df_market) -> str:
    if df_market is None or "variation" not in df_market.columns or df_market.empty:
        return "Neutre"
    last_date = df_market["date"].max()
    day = df_market[df_market["date"] == last_date]
    adv = int((day["variation"] > 0).sum())
    dec = int((day["variation"] < 0).sum())
    if adv > dec * 1.3:
        return "Haussier"
    if dec > adv * 1.3:
        return "Baissier"
    return "Neutre"


# ---------------------------------------------------------------------------
# Appel Gemini (recherche web) — isolé et défensif
# ---------------------------------------------------------------------------
def _parse_json(text: str) -> dict:
    """Extrait un objet JSON d'une réponse Gemini (tolère ``` et bruit)."""
    if not text:
        return {}
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        if t.lower().startswith("json"):
            t = t[4:]
    start, end = t.find("{"), t.rfind("}")
    if start == -1 or end == -1:
        return {}
    try:
        return json.loads(t[start : end + 1])
    except (ValueError, TypeError):
        return {}


def _extract_sources(resp) -> list[str]:
    urls: list[str] = []
    try:
        cand = resp.candidates[0]
        gm = getattr(cand, "grounding_metadata", None)
        for ch in getattr(gm, "grounding_chunks", None) or []:
            uri = getattr(getattr(ch, "web", None), "uri", None)
            if uri:
                urls.append(uri)
    except Exception:  # noqa: BLE001 - grounding optionnel
        pass
    return urls[:4]


def _normalize_reco(value: str) -> str:
    """Ramène la recommandation Gemini à l'une des valeurs autorisées."""
    v = (value or "").strip().lower()
    if "fort" in v and "achat" in v:
        return "Achat fort"
    if "achat" in v or "acheter" in v:
        return "Achat modéré"
    if "vente" in v or "vendre" in v:
        return "Vente"
    return "Conservation"


def _call_gemini(client, *, symbole, nom, market_sentiment, analyse):
    """Interroge Gemini (recherche web) -> dict {recommandation, justification, ...}.

    ⚠️ SDK `google-genai` : ajuster ici si l'API change.
    """
    from google.genai import types  # dépendance optionnelle, import local

    # Selon que le grounding web est actif ou non, on adapte la consigne et les outils.
    if USE_WEB_GROUNDING:
        contexte = ("En tenant compte du marché, des informations web récentes "
                    "(recherche web) et de cette analyse, ")
        tools = [types.Tool(google_search=types.GoogleSearch())]
    else:
        contexte = ("En tenant compte du marché, de ce que tu connais de cette société "
                    "et de cette analyse, ")
        tools = None

    prompt = (
        "Tu es analyste actions spécialiste de la BRVM (bourse régionale de l'UEMOA).\n"
        f"Action : {nom} ({symbole}).\n"
        f"Sentiment de marché BRVM du jour : {market_sentiment}.\n"
        f"Analyse quantitative interne : {analyse}.\n\n"
        + contexte +
        "donne une recommandation CLAIRE à ~15 jours.\n"
        "Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec ces clés :\n"
        '{"recommandation": "Achat fort" | "Achat modéré" | "Conservation" | "Vente", '
        '"justification": "1 à 2 phrases en français expliquant POURQUOI", '
        '"sentiment_web": "Positif" | "Neutre" | "Négatif"}'
    )

    config = types.GenerateContentConfig(tools=tools, temperature=0.2)
    resp = client.models.generate_content(model=GEMINI_MODEL, contents=prompt, config=config)

    data = _parse_json(getattr(resp, "text", "") or "")
    return {
        "recommandation": _normalize_reco(data.get("recommandation", "")),
        "justification": str(data.get("justification", "")).strip()[:600],
        "sentiment_web": str(data.get("sentiment_web", "Neutre"))[:20],
        "sources": _extract_sources(resp),
    }


def _call_gemini_batch(client, items, market_sentiment):
    """UNE seule requête pour PLUSIEURS actions (mode gratuit, sans grounding).

    `items` : liste de {symbole, nom, analyse}.
    Retourne {SYMBOLE: {recommandation, justification, sentiment_web, sources}}.
    Réduit drastiquement le nombre d'appels : ~3 requêtes couvrent les 47 titres.
    """
    from google.genai import types  # dépendance optionnelle, import local

    lignes = "\n".join(f"- {it['symbole']} ({it['nom']}) : {it['analyse']}" for it in items)
    prompt = (
        "Tu es analyste actions spécialiste de la BRVM (bourse régionale de l'UEMOA).\n"
        f"Sentiment de marché BRVM du jour : {market_sentiment}.\n"
        "Analyse les actions suivantes (sigle, nom, données quantitatives internes) :\n"
        f"{lignes}\n\n"
        "Pour CHAQUE action, en tenant compte du marché, de ce que tu connais de la "
        "société et de ces données, donne une recommandation CLAIRE à ~15 jours.\n"
        "Réponds UNIQUEMENT par un objet JSON valide dont les CLÉS sont les SIGLES, "
        "chaque valeur ayant : "
        '{"recommandation": "Achat fort"|"Achat modéré"|"Conservation"|"Vente", '
        '"justification": "1 à 2 phrases en français", '
        '"sentiment_web": "Positif"|"Neutre"|"Négatif"}. '
        'Exemple : {"SGBC": {"recommandation": "Achat modéré", "justification": "…", '
        '"sentiment_web": "Positif"}}'
    )
    config = types.GenerateContentConfig(temperature=0.2)
    resp = client.models.generate_content(model=GEMINI_MODEL, contents=prompt, config=config)

    data = _parse_json(getattr(resp, "text", "") or "")
    out = {}
    for sym, v in data.items():
        if not isinstance(v, dict):
            continue
        out[str(sym).strip().upper()] = {
            "recommandation": _normalize_reco(v.get("recommandation", "")),
            "justification": str(v.get("justification", "")).strip()[:600],
            "sentiment_web": str(v.get("sentiment_web", "Neutre"))[:20],
            "sources": [],
        }
    return out


# ---------------------------------------------------------------------------
# Orchestrateur : parcourt les actions du jour, appelle Gemini, écrit le JSON
# ---------------------------------------------------------------------------
def _analyse_context(row) -> str:
    """Résume l'analyse quantitative interne pour nourrir le prompt Gemini."""
    parts = []
    if row.get("score_ia") is not None:
        parts.append(f"score IA {row['score_ia']}/10")
    if row.get("per") not in (None, 0):
        parts.append(f"PER {row['per']}")
    if row.get("rsi_14") is not None:
        parts.append(f"RSI {round(float(row['rsi_14']))}")
    if row.get("variation") is not None:
        parts.append(f"variation du jour {row['variation']}%")
    return ", ".join(parts) if parts else "non disponible"


def run_gemini_reco(df_market, limit: int | None = None):
    """Génère les recommandations Gemini du jour et écrit gemini_recos.json."""
    mode = "grounding web (1 appel/action)" if USE_WEB_GROUNDING else "mode lots"
    print(f"[GEMINI] Recommandations IA par action — {mode}...")
    if not GEMINI_API_KEY:
        print("[GEMINI] GEMINI_API_KEY absent : étape ignorée.")
        return 0
    if df_market is None or df_market.empty:
        print("[GEMINI] Aucune donnée marché. Étape ignorée.")
        return 0

    try:
        from google import genai
    except ImportError:
        print("[GEMINI] Paquet 'google-genai' non installé (pip install google-genai). Étape ignorée.")
        return 0
    client = genai.Client(api_key=GEMINI_API_KEY)

    # Dernière séance uniquement, une ligne par action
    last_date = df_market["date"].max()
    day = df_market[df_market["date"] == last_date].drop_duplicates(subset=["symbole"], keep="last")
    # Tri par score : si une exécution est partielle, les meilleurs titres passent d'abord.
    if "score_ia" in day.columns:
        day = day.sort_values("score_ia", ascending=False)
    if limit:                       # `limit` = borne facultative (tests) ; sinon TOUTES les actions
        day = day.head(limit)

    market_sentiment = compute_market_sentiment(df_market)
    date_str = str(last_date)[:10]
    print(f"[GEMINI] Séance {date_str} | {len(day)} actions | marché {market_sentiment}")

    # Contexte compact par action
    items = [
        {"symbole": r["symbole"], "nom": (r.get("nom", r["symbole"]) or r["symbole"]),
         "analyse": _analyse_context(r)}
        for _, r in day.iterrows()
    ]
    nom_par_sym = {it["symbole"]: it["nom"] for it in items}

    def _retry_429(fn, *a, **kw):
        """Exécute avec un ré-essai en cas de 429 (limite de débit ponctuelle)."""
        for attempt in range(2):
            try:
                return fn(*a, **kw)
            except Exception as exc:  # noqa: BLE001
                if "429" in str(exc) and attempt == 0:
                    print("[GEMINI]   quota momentané (429), pause 25s puis nouvel essai...")
                    time.sleep(25)
                    continue
                raise

    recos = {}
    if USE_WEB_GROUNDING:
        # Grounding actif (plan payant) : 1 appel par action = meilleure recherche web.
        for it in items:
            try:
                g = _retry_429(_call_gemini, client, symbole=it["symbole"], nom=it["nom"],
                               market_sentiment=market_sentiment, analyse=it["analyse"])
            except Exception as exc:  # noqa: BLE001 - un échec isolé n'arrête pas le lot
                print(f"[GEMINI] {it['symbole']} : échec appel Gemini ({exc}). Ignoré.")
                continue
            recos[it["symbole"]] = {"nom": it["nom"], **g}
            print(f"[GEMINI]   {it['symbole']}: {g['recommandation']}")
            time.sleep(2.0)
    else:
        # Mode gratuit : LOTS de BATCH_SIZE actions -> ~3 appels couvrent tous les titres.
        for i in range(0, len(items), BATCH_SIZE):
            batch = items[i:i + BATCH_SIZE]
            syms = [it["symbole"] for it in batch]
            try:
                res = _retry_429(_call_gemini_batch, client, batch, market_sentiment)
            except Exception as exc:  # noqa: BLE001 - un lot raté n'arrête pas les autres
                print(f"[GEMINI] lot {syms[:3]}… échec ({exc}). Ignoré.")
                continue
            got = 0
            for sym in syms:
                if sym in res:
                    recos[sym] = {"nom": nom_par_sym.get(sym, sym), **res[sym]}
                    got += 1
            print(f"[GEMINI]   lot {i // BATCH_SIZE + 1} : {got}/{len(batch)} recos")
            time.sleep(3.0)

    if not recos:
        print("[GEMINI] Aucune recommandation produite.")
        return 0

    payload = {
        "date": date_str,
        "market_sentiment": market_sentiment,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "recos": recos,
    }
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"[GEMINI] {len(recos)} recommandations écrites dans {OUTPUT_PATH}")
    return len(recos)
