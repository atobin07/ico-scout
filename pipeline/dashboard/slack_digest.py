"""Slack Block Kit digest for hot opportunities."""

import logging
import os
from datetime import datetime, timezone

import requests

logger = logging.getLogger(__name__)


def _days_to_deadline(deadline_iso: str | None) -> str:
    if not deadline_iso:
        return "No deadline"
    try:
        if deadline_iso.endswith("Z"):
            deadline_iso = deadline_iso[:-1] + "+00:00"
        dt = datetime.fromisoformat(deadline_iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        days = (dt - datetime.now(timezone.utc)).days
        if days < 0:
            return "Past deadline"
        if days == 0:
            return "*Today*"
        return f"*{days}d*"
    except ValueError:
        return "Unknown"


def _format_value(v_min, v_max) -> str:
    if v_max and v_max >= 1_000_000:
        return f"${v_max / 1_000_000:.1f}M"
    if v_max and v_max >= 1_000:
        return f"${v_max / 1_000:.0f}K"
    if v_max:
        return f"${v_max:,.0f}"
    return "TBD"


def _score_emoji(score: int) -> str:
    if score >= 85:
        return ":large_green_circle:"
    if score >= 70:
        return ":large_blue_circle:"
    if score >= 50:
        return ":large_yellow_circle:"
    return ":white_circle:"


def build_blocks(opportunities: list[dict]) -> list[dict]:
    now_str = datetime.now(timezone.utc).strftime("%b %d, %Y")
    blocks: list[dict] = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"PrimeLayer Contract Intel — {now_str}", "emoji": True},
        },
        {"type": "divider"},
    ]

    if not opportunities:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": ":calendar: Quiet day — no hot opportunities scored 70+ right now. New scans running on schedule.",
            },
        })
        return blocks

    blocks.append({
        "type": "section",
        "text": {"type": "mrkdwn", "text": f"*{len(opportunities)} hot opportunities* scoring 70+ composite"},
    })

    for opp in opportunities[:10]:
        composite = opp.get("composite_score") or 0
        fit = opp.get("fit_score") or 0
        title = opp.get("title") or "Untitled"
        url = opp.get("url") or ""
        agency = opp.get("agency_or_company") or "Unknown"
        rationale = opp.get("fit_rationale") or ""
        deadline_str = _days_to_deadline(opp.get("response_deadline"))
        value_str = _format_value(opp.get("estimated_value_min"), opp.get("estimated_value_max"))
        emoji = _score_emoji(composite)

        title_link = f"<{url}|{title}>" if url else title

        blocks.append({"type": "divider"})
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"{emoji} *{title_link}*\n"
                    f"_{agency}_\n"
                    f"Value: {value_str}  |  Deadline: {deadline_str}  |  "
                    f"Composite: *{composite}* · Fit: {fit}\n"
                    f"{rationale}"
                ),
            },
        })

    blocks.append({"type": "divider"})
    blocks.append({
        "type": "context",
        "elements": [{"type": "mrkdwn", "text": "PrimeLayer Contract Intel · <https://primelayer.vercel.app/hot|Open Dashboard>"}],
    })
    return blocks


def send_digest(supabase_client, webhook_url: str | None = None) -> dict:
    webhook_url = webhook_url or os.environ.get("SLACK_WEBHOOK_URL", "")
    if not webhook_url:
        logger.warning("SLACK_WEBHOOK_URL not set — skipping digest")
        return {"sent": False, "reason": "no_webhook_url"}

    resp = supabase_client.table("hot_opportunities").select("*").limit(10).execute()
    opps = resp.data or []

    blocks = build_blocks(opps)
    payload = {"blocks": blocks}

    try:
        r = requests.post(webhook_url, json=payload, timeout=15)
        r.raise_for_status()
        logger.info("Slack digest sent: %d opportunities", len(opps))
        return {"sent": True, "opportunity_count": len(opps)}
    except Exception as exc:
        logger.error("Slack digest failed: %s", exc)
        return {"sent": False, "error": str(exc)}
