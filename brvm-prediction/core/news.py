"""
core/news.py
============
Actualités par société -> artefact `news.json` (comme risk/seasonality), régénéré
par un cron quotidien et servi par le CDN.

Source : Google News RSS (gratuit, structuré, sans clé). Par société on interroge
`"{nom}" BRVM`, on garde les titres récents (titre + source + date + lien), puis
un résumé Gemini EN FRANÇAIS condense la tendance (depuis les titres seulement,
sans recherche web payante). Dégradation propre : pas de Gemini -> titres conservés ;
société sans actu -> absente du fichier.

⚠️ On n'affiche que TITRE + SOURCE + LIEN (renvoi à l'article d'origine) — pas de
texte intégral. Contenu externe = données, jamais exécuté.
"""

from __future__ import annotations

import os
import re
import time
import unicodedata
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import requests

from core.config import BASE_DIR, GEMINI_API_KEY, supabase_client
from core.gemini_reco import GEMINI_MODEL, _parse_json

OUTPUT_PATH = os.path.join(os.path.dirname(BASE_DIR), "brvm-quant", "public", "data", "news.json")
RSS_URL = "https://news.google.com/rss/search"
UA = {"User-Agent": "Mozilla/5.0 (compatible; InvestPro/1.0; +https://invest-pro-ruby.vercel.app)"}


_COUNTRY_RE = re.compile(
    r"\b(C[ÔO]TE\s+D[' ]?IVOIRE|S[ÉE]N[ÉE]GAL|BURKINA(?:\s+FASO)?|B[ÉE]NIN|MALI|TOGO|NIGER|"
    r"GUIN[ÉE]E[- ]?BISSAU)\b", re.I)


def _chunks(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def _norm(s: str) -> str:
    """Minuscule + sans accents (comparaison robuste des titres)."""
    return "".join(c for c in unicodedata.normalize("NFKD", (s or "").lower())
                   if not unicodedata.combining(c))


def short_name(nom: str) -> str:
    """Nom distinctif (sans le pays) pour la requête. Ex. 'SONATEL SENEGAL' -> 'SONATEL'."""
    s = _COUNTRY_RE.sub("", nom or "").strip(" -,")
    return s or (nom or "")


def _fetch_google_news(query: str, must_match: list[str], limit: int = 5, max_age_days: int = 45) -> list[dict]:
    """Titres récents pour une requête Google News RSS, FILTRÉS : on ne garde que
    les titres qui mentionnent réellement la société (`must_match` = nom court / sigle
    normalisés) -> évite les revues de marché génériques (bruit)."""
    url = f"{RSS_URL}?" + urllib.parse.urlencode({"q": query, "hl": "fr", "gl": "CI", "ceid": "CI:fr"})
    resp = None
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=UA, timeout=15)
            resp.raise_for_status()
            break
        except Exception:  # noqa: BLE001 - réseau capricieux -> retry puis abandon
            if attempt == 2:
                return []
            time.sleep(1.5 * (attempt + 1))

    return _parse_rss_items(resp.content, must_match, limit, max_age_days)


def _parse_rss_items(content: bytes, must_match: list[str], limit: int = 5, max_age_days: int = 45) -> list[dict]:
    """Parse un flux RSS Google News (testable sans réseau) -> items filtrés."""
    try:
        root = ET.fromstring(content)
    except Exception:  # noqa: BLE001
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
    items, seen = [], set()
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        if not title or not link:
            continue
        src_el = it.find("source")
        source = (src_el.text or "").strip() if src_el is not None else ""
        # Le titre Google News est « Titre - Source » : on isole le titre.
        headline = title
        if source and title.endswith(f" - {source}"):
            headline = title[: -(len(source) + 3)].strip()
        elif " - " in title:
            headline, _, src2 = title.rpartition(" - ")
            headline, source = headline.strip(), (source or src2.strip())

        dt = None
        pub = it.findtext("pubDate")
        if pub:
            try:
                dt = parsedate_to_datetime(pub)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except Exception:  # noqa: BLE001
                dt = None
        if dt and dt < cutoff:
            continue

        # FILTRE ANTI-BRUIT : le titre doit mentionner la société (nom court / sigle).
        norm_title = _norm(headline)
        if must_match and not any(m and m in norm_title for m in must_match):
            continue

        key = headline.lower()[:80]
        if key in seen:
            continue
        seen.add(key)
        items.append({"title": headline, "source": source,
                      "date": dt.strftime("%Y-%m-%d") if dt else None, "link": link,
                      "_dt": dt or datetime.min.replace(tzinfo=timezone.utc)})

    items.sort(key=lambda x: x["_dt"], reverse=True)
    for x in items:
        x.pop("_dt", None)
    return items[:limit]


def _add_summaries(news: dict) -> None:
    """Ajoute un résumé Gemini FR par société (batch). Best effort, in place."""
    if not news or not GEMINI_API_KEY:
        return
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("[NEWS] google-genai absent -> pas de résumé (titres conservés).")
        return

    client = genai.Client(api_key=GEMINI_API_KEY)
    for batch in _chunks(list(news.keys()), 12):
        lignes = [f'- {s} ({news[s]["nom"]}) : ' + " | ".join(i["title"] for i in news[s]["items"][:5])
                  for s in batch]
        prompt = (
            "Voici des titres d'actualité récents, par société cotée à la BRVM. Pour CHAQUE "
            "société, résume la TENDANCE de l'actualité en UNE phrase française, neutre et "
            "factuelle (ni conseil, ni exagération). Réponds en JSON STRICT "
            '{"SIGLE": "phrase"} sans texte autour.\n' + "\n".join(lignes)
        )
        try:
            resp = client.models.generate_content(
                model=GEMINI_MODEL, contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2),
            )
            data = _parse_json(getattr(resp, "text", "") or "")
            for s in batch:
                if isinstance(data.get(s), str) and data[s].strip():
                    news[s]["summary"] = data[s].strip()[:400]
        except Exception as exc:  # noqa: BLE001
            print(f"[NEWS] Résumé Gemini échoué pour un lot ({exc}). Titres conservés.")
        time.sleep(1.0)


def run_news(limit_per: int = 5) -> int:
    """Récupère l'actualité par société -> public/data/news.json. Retourne le nb de titres couverts."""
    print("[NEWS] Récupération de l'actualité par société (Google News RSS)...")
    dr = (supabase_client.table("full_stock_pro").select("date")
          .order("date", desc=True).limit(1).execute())
    if not dr.data:
        print("[NEWS] Aucune donnée marché.")
        return 0
    last = str(dr.data[0]["date"])[:10]
    rows = (supabase_client.table("full_stock_pro").select("symbole,nom")
            .eq("date", last).execute().data) or []
    names = {r["symbole"]: r["nom"] for r in rows if r.get("symbole") and r.get("nom")}

    news: dict = {}
    for sym, nom in names.items():
        short = short_name(nom)
        must_match = [m for m in {_norm(short), _norm(sym)} if len(m) >= 3]
        items = _fetch_google_news(f"{short} BRVM", must_match, limit=limit_per)
        if items:
            news[sym] = {"summary": None, "items": items, "nom": nom}
        time.sleep(0.4)  # politesse envers Google News
    print(f"[NEWS] {len(news)}/{len(names)} sociétés avec actualité récente.")

    _add_summaries(news)

    import json
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "count": len(news),
        "news": {s: {"summary": v["summary"], "items": v["items"]} for s, v in news.items()},
    }
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"[NEWS] {len(news)} sociétés écrites dans {OUTPUT_PATH}.")
    return len(news)
