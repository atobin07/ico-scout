"""Scoring engine: deterministic sub-scores + Claude fit scoring."""

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

import anthropic

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {
    "voice_ai", "automation", "llm_impl", "data_pipeline",
    "telephony", "trading", "saas_build", "other",
}

# ─── Deterministic sub-scores ────────────────────────────────────────────────

def score_urgency(response_deadline: str | None) -> int:
    """Days-to-deadline → urgency score (higher = more urgent, better)."""
    if not response_deadline:
        return 30
    try:
        if response_deadline.endswith("Z"):
            response_deadline = response_deadline[:-1] + "+00:00"
        deadline = datetime.fromisoformat(response_deadline)
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        days = (deadline - datetime.now(timezone.utc)).days
    except (ValueError, TypeError):
        return 30

    if days < 0:
        return 0
    if days < 7:
        return 20
    if days < 21:
        return 90
    if days < 60:
        return 100
    if days < 120:
        return 70
    return 40


def score_effort(contract_type: str | None, value_max: float | None) -> int:
    """Estimated ROI proxy (higher = better for us)."""
    base_by_type = {
        "federal": 30,
        "state": 60,
        "local": 65,
        "enterprise": 55,
        "marketplace": 85,
        "grant": 40,
    }
    base = base_by_type.get((contract_type or "").lower(), 50)

    if value_max is None:
        return base
    if value_max >= 500_000:
        base += 20
    elif value_max >= 100_000:
        base += 10
    elif 0 < value_max < 10_000:
        base -= 30

    return max(0, min(100, base))


def score_competition(contract_type: str | None, set_aside_type: str | None) -> int:
    """Competition level (higher = more competition = worse for us)."""
    base_by_type = {
        "federal": 70,
        "state": 60,
        "local": 55,
        "enterprise": 65,
        "marketplace": 90,
        "grant": 75,
    }
    base = base_by_type.get((contract_type or "").lower(), 65)

    if set_aside_type and any(
        kw in set_aside_type.lower()
        for kw in ("small business", "small_business", "8(a)", "hubzone", "wosb", "sdvosb", "vosb")
    ):
        base -= 20

    return max(0, min(100, base))


def score_composite(
    fit: int,
    urgency: int,
    effort: int,
    competition: int,
    fit_w: float = 0.5,
    urgency_w: float = 0.2,
    effort_w: float = 0.2,
    competition_w: float = 0.1,
) -> int:
    return round(
        fit * fit_w
        + urgency * urgency_w
        + effort * effort_w
        + (100 - competition) * competition_w
    )


# ─── Claude fit scoring ───────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a business development analyst for an AI consulting firm.
Your job is to score inbound contract/grant opportunities against the firm's ideal customer profile (ICP).
Respond ONLY with a valid JSON object — no code fences, no prose."""

USER_PROMPT_TEMPLATE = """
ICP:
{icp}

Capabilities:
{capabilities}

Case Studies:
{case_studies}

Avoid List:
{avoid_list}

---

Opportunity:
Title: {title}
Agency/Company: {agency}
Contract Type: {contract_type}
Description:
{description}

---

Respond with this exact JSON structure:
{{
  "fit_score": <integer 0-100>,
  "fit_rationale": "<one concise sentence explaining the score>",
  "categories": [<array of strings from: voice_ai, automation, llm_impl, data_pipeline, telephony, trading, saas_build, other>],
  "red_flags": [<array of strings, or empty array>]
}}
"""


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def score_with_claude(opportunity: dict, config: dict, client: anthropic.Anthropic) -> dict:
    """Call Claude to score a single opportunity. Returns updated fields dict."""
    model = os.environ.get("CLAUDE_MODEL", "claude-opus-4-7")

    prompt = USER_PROMPT_TEMPLATE.format(
        icp=config.get("icp", ""),
        capabilities=config.get("capabilities", ""),
        case_studies=config.get("case_studies", ""),
        avoid_list=config.get("avoid_list", ""),
        title=opportunity.get("title", ""),
        agency=opportunity.get("agency_or_company", ""),
        contract_type=opportunity.get("contract_type", ""),
        description=(opportunity.get("description") or "")[:4000],
    )

    response = client.messages.create(
        model=model,
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text
    parsed = json.loads(_strip_fences(raw))

    fit_score = max(0, min(100, int(parsed.get("fit_score", 0))))
    categories = [c for c in parsed.get("categories", []) if c in VALID_CATEGORIES]
    red_flags = [str(f) for f in parsed.get("red_flags", [])]
    fit_rationale = str(parsed.get("fit_rationale", ""))

    urgency = score_urgency(opportunity.get("response_deadline"))
    effort = score_effort(opportunity.get("contract_type"), opportunity.get("estimated_value_max"))
    competition = score_competition(opportunity.get("contract_type"), opportunity.get("set_aside_type"))

    composite = score_composite(
        fit=fit_score,
        urgency=urgency,
        effort=effort,
        competition=competition,
        fit_w=float(config.get("fit_weight", 0.5)),
        urgency_w=float(config.get("urgency_weight", 0.2)),
        effort_w=float(config.get("effort_weight", 0.2)),
        competition_w=float(config.get("competition_weight", 0.1)),
    )

    return {
        "fit_score": fit_score,
        "fit_rationale": fit_rationale,
        "categories": categories,
        "red_flags": red_flags,
        "urgency_score": urgency,
        "effort_score": effort,
        "competition_score": competition,
        "composite_score": composite,
        "scored_at": datetime.now(timezone.utc).isoformat(),
    }


def score_batch(
    opportunities: list[dict],
    config: dict,
    supabase_client,
    batch_cap: int = 100,
) -> dict:
    """Score up to `batch_cap` unscored opportunities and upsert results."""
    model = os.environ.get("CLAUDE_MODEL", "claude-opus-4-7")
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Fetch unscored rows from DB (scored_at IS NULL)
    resp = (
        supabase_client.table("opportunities")
        .select("id, title, agency_or_company, contract_type, description, response_deadline, estimated_value_max, set_aside_type")
        .is_("scored_at", "null")
        .limit(batch_cap)
        .execute()
    )
    unscored = resp.data or []

    scored = 0
    errors = 0
    for opp in unscored:
        try:
            updates = score_with_claude(opp, config, client)
            supabase_client.table("opportunities").update(updates).eq("id", opp["id"]).execute()
            scored += 1
        except Exception as exc:
            logger.error("Scoring failed for opp %s: %s", opp.get("id"), exc)
            errors += 1

    logger.info("Scoring complete: scored=%d errors=%d model=%s", scored, errors, model)
    return {"scored": scored, "errors": errors}
