"""SAM.gov Opportunities API scraper."""

import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)

NAICS_CODES = [
    "541511", "541512", "541513", "541519",
    "541611", "541618", "541690", "541715",
]

KEYWORDS = [
    "artificial intelligence", "machine learning", "llm", "generative ai",
    "chatbot", "conversational ai", "voice ai", "nlp", "automation", "rpa",
    "predictive analytics", "computer vision", "mlops", "openai", "anthropic",
    "claude", "gpt", "copilot", "agent", "large language model",
]

SAM_API_BASE = "https://api.sam.gov/opportunities/v2/search"
PAGE_SIZE = 100


def _keyword_match(text: str) -> list[str]:
    lower = text.lower()
    return [kw for kw in KEYWORDS if kw in lower]


def _normalize(raw: dict) -> dict | None:
    """Convert a raw SAM.gov opportunity record to our schema."""
    opp_id = raw.get("noticeId") or raw.get("id", "")
    title = raw.get("title", "")
    description = raw.get("description", "") or ""

    # Cheap keyword pre-filter before any scoring
    matched = _keyword_match(title + " " + description)
    if not matched:
        return None

    # Value range
    value_min = None
    value_max = None
    award = raw.get("award") or {}
    if award.get("amount"):
        try:
            value_max = float(award["amount"])
        except (TypeError, ValueError):
            pass

    # NAICS
    naics_raw = raw.get("naicsCode") or raw.get("naics") or ""
    if isinstance(naics_raw, list):
        naics_codes = [str(n) for n in naics_raw]
    elif naics_raw:
        naics_codes = [str(naics_raw)]
    else:
        naics_codes = []

    # Set-aside
    set_aside = raw.get("typeOfSetAsideDescription") or raw.get("typeOfSetAside") or ""

    # Dates
    posted_str = raw.get("postedDate") or raw.get("publishDate") or ""
    deadline_str = raw.get("responseDeadLine") or raw.get("archiveDate") or ""

    posted_date = None
    if posted_str:
        try:
            posted_date = datetime.strptime(posted_str[:10], "%Y-%m-%d").date()
        except ValueError:
            pass

    response_deadline = None
    if deadline_str:
        try:
            response_deadline = datetime.strptime(deadline_str[:19], "%Y-%m-%dT%H:%M:%S").replace(
                tzinfo=timezone.utc
            )
        except ValueError:
            try:
                response_deadline = datetime.strptime(deadline_str[:10], "%Y-%m-%d").replace(
                    tzinfo=timezone.utc
                )
            except ValueError:
                pass

    office = raw.get("officeAddress") or {}
    org_name = (
        raw.get("departmentName")
        or raw.get("subtierName")
        or raw.get("organizationHierarchy", {}).get("department", {}).get("name")
        or ""
    )

    return {
        "source": "sam_gov",
        "source_id": opp_id,
        "url": f"https://sam.gov/opp/{opp_id}/view",
        "title": title,
        "description": description[:10000],  # cap to avoid huge payloads
        "agency_or_company": org_name,
        "contract_type": _map_contract_type(raw.get("type") or raw.get("baseType") or ""),
        "posted_date": posted_date.isoformat() if posted_date else None,
        "response_deadline": response_deadline.isoformat() if response_deadline else None,
        "estimated_value_min": value_min,
        "estimated_value_max": value_max,
        "naics_codes": naics_codes,
        "set_aside_type": set_aside,
        "solicitation_number": raw.get("solicitationNumber") or raw.get("solicitudeNumber") or "",
        "keywords_matched": matched,
        "raw_content": raw,
    }


def _map_contract_type(sam_type: str) -> str:
    mapping = {
        "o": "federal",
        "p": "federal",
        "k": "federal",
        "r": "federal",
        "s": "federal",
        "g": "grant",
        "a": "federal",
        "u": "federal",
        "i": "federal",
        "j": "federal",
        "m": "federal",
    }
    return mapping.get(sam_type.lower(), "federal")


def fetch_opportunities(
    api_key: str | None = None,
    days_back: int = 7,
    max_pages: int = 20,
) -> list[dict]:
    """Fetch and pre-filter SAM.gov opportunities. Returns normalized records."""
    api_key = api_key or os.environ["SAM_GOV_API_KEY"]
    posted_from = (datetime.utcnow() - timedelta(days=days_back)).strftime("%m/%d/%Y")

    results: list[dict] = []
    params_base = {
        "api_key": api_key,
        "postedFrom": posted_from,
        "limit": PAGE_SIZE,
        "offset": 0,
        "ptype": "o,p,k,r,s",  # solicitation types
    }

    for naics in NAICS_CODES:
        offset = 0
        page = 0
        while page < max_pages:
            params = {**params_base, "naicsCode": naics, "offset": offset}
            try:
                resp = requests.get(SAM_API_BASE, params=params, timeout=30)
                resp.raise_for_status()
                data = resp.json()
            except Exception as exc:
                logger.error("SAM.gov fetch error naics=%s offset=%d: %s", naics, offset, exc)
                break

            opps = data.get("opportunitiesData") or data.get("data") or []
            if not opps:
                break

            for raw in opps:
                normalized = _normalize(raw)
                if normalized:
                    results.append(normalized)

            total = data.get("totalRecords") or data.get("total") or 0
            offset += PAGE_SIZE
            page += 1
            if offset >= total:
                break

            time.sleep(0.5)  # be polite

    logger.info("SAM.gov: fetched %d keyword-matched opportunities", len(results))
    return results
