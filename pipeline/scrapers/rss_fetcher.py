"""Generic RSS/Atom feed fetcher. Feeds are driven by rows in the `sources` table."""

import hashlib
import logging
import os
from datetime import datetime, timezone
from typing import Any

import feedparser

logger = logging.getLogger(__name__)

KEYWORDS = [
    "artificial intelligence", "machine learning", "llm", "generative ai",
    "chatbot", "conversational ai", "voice ai", "nlp", "automation", "rpa",
    "predictive analytics", "computer vision", "mlops", "openai", "anthropic",
    "claude", "gpt", "copilot", "agent", "large language model",
]


def _keyword_match(text: str) -> list[str]:
    lower = text.lower()
    return [kw for kw in KEYWORDS if kw in lower]


def _entry_id(feed_name: str, entry: Any) -> str:
    """Stable source_id: prefer the feed's own id, fall back to url hash."""
    raw_id = getattr(entry, "id", None) or getattr(entry, "link", None) or ""
    if raw_id:
        return raw_id[:500]
    digest = hashlib.sha256(f"{feed_name}:{getattr(entry, 'title', '')}".encode()).hexdigest()[:16]
    return digest


def _parse_date(entry: Any) -> str | None:
    for attr in ("published_parsed", "updated_parsed"):
        val = getattr(entry, attr, None)
        if val:
            try:
                dt = datetime(*val[:6], tzinfo=timezone.utc)
                return dt.isoformat()
            except Exception:
                pass
    return None


def _normalize_entry(source_name: str, entry: Any) -> dict | None:
    title = getattr(entry, "title", "") or ""
    summary = getattr(entry, "summary", "") or ""
    content_list = getattr(entry, "content", []) or []
    full_text = summary
    if content_list:
        full_text = content_list[0].get("value", summary)

    combined = title + " " + full_text
    matched = _keyword_match(combined)
    if not matched:
        return None

    return {
        "source": "rss",
        "source_id": _entry_id(source_name, entry),
        "url": getattr(entry, "link", None),
        "title": title,
        "description": full_text[:10000],
        "agency_or_company": source_name,
        "contract_type": "grant",  # most RSS sources here are grants
        "posted_date": _parse_date(entry),
        "response_deadline": None,
        "estimated_value_min": None,
        "estimated_value_max": None,
        "naics_codes": [],
        "set_aside_type": None,
        "solicitation_number": None,
        "keywords_matched": matched,
        "raw_content": {
            "title": title,
            "summary": summary,
            "link": getattr(entry, "link", None),
            "id": getattr(entry, "id", None),
        },
    }


def fetch_feed(source_name: str, url: str) -> list[dict]:
    """Parse a single RSS/Atom feed and return keyword-filtered normalized records."""
    try:
        parsed = feedparser.parse(url)
    except Exception as exc:
        logger.error("RSS fetch error source=%s url=%s: %s", source_name, url, exc)
        return []

    results = []
    for entry in parsed.entries:
        normalized = _normalize_entry(source_name, entry)
        if normalized:
            results.append(normalized)

    logger.info("RSS %s: fetched %d keyword-matched entries from %d total", source_name, len(results), len(parsed.entries))
    return results


def fetch_all_active_feeds(supabase_client) -> list[dict]:
    """Fetch all active RSS sources from the `sources` table."""
    resp = supabase_client.table("sources").select("*").eq("active", True).eq("source_type", "rss").execute()
    sources = resp.data or []

    all_results: list[dict] = []
    errors: dict[str, str] = {}

    for source in sources:
        try:
            records = fetch_feed(source["name"], source["url"])
            all_results.extend(records)
            supabase_client.table("sources").update({
                "last_fetched_at": datetime.now(timezone.utc).isoformat(),
                "last_error": None,
            }).eq("id", source["id"]).execute()
        except Exception as exc:
            err = str(exc)
            logger.error("RSS source %s failed: %s", source["name"], err)
            errors[source["name"]] = err
            supabase_client.table("sources").update({
                "last_error": err,
            }).eq("id", source["id"]).execute()

    return all_results
