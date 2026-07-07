"""PrimeLayer Contract Intel — Pipeline Orchestrator.

Run locally:  python main.py
Railway cron: configured in railway.json (0 6 * * *)
"""

import logging
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("main")


def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def get_active_config(sb: Client) -> dict:
    resp = sb.table("scoring_config").select("*").eq("active", True).limit(1).execute()
    if not resp.data:
        raise RuntimeError("No active scoring_config row found. Run seed.sql first.")
    return resp.data[0]


def upsert_opportunities(sb: Client, records: list[dict]) -> dict:
    if not records:
        return {"upserted": 0, "skipped": 0}
    upserted = 0
    skipped = 0
    for rec in records:
        try:
            sb.table("opportunities").upsert(
                rec,
                on_conflict="source,source_id",
                ignore_duplicates=False,
            ).execute()
            upserted += 1
        except Exception as exc:
            logger.warning("Upsert skipped %s/%s: %s", rec.get("source"), rec.get("source_id"), exc)
            skipped += 1
    return {"upserted": upserted, "skipped": skipped}


def run() -> dict:
    start = datetime.now(timezone.utc)
    summary: dict = {
        "started_at": start.isoformat(),
        "sam_gov": {},
        "rss": {},
        "scoring": {},
        "digest": {},
    }

    sb = get_supabase()
    config = get_active_config(sb)

    # ── Stage 1: SAM.gov ─────────────────────────────────────────────────────
    try:
        from scrapers.sam_gov import fetch_opportunities
        sam_records = fetch_opportunities()
        upsert_result = upsert_opportunities(sb, sam_records)
        summary["sam_gov"] = {"fetched": len(sam_records), **upsert_result}

        # Mark source as fetched
        sb.table("sources").update({
            "last_fetched_at": datetime.now(timezone.utc).isoformat(),
            "last_error": None,
        }).eq("name", "SAM.gov Opportunities").execute()
    except Exception as exc:
        logger.error("SAM.gov stage failed: %s", exc)
        summary["sam_gov"] = {"error": str(exc)}

    # ── Stage 2: RSS ─────────────────────────────────────────────────────────
    try:
        from scrapers.rss_fetcher import fetch_all_active_feeds
        rss_records = fetch_all_active_feeds(sb)
        upsert_result = upsert_opportunities(sb, rss_records)
        summary["rss"] = {"fetched": len(rss_records), **upsert_result}
    except Exception as exc:
        logger.error("RSS stage failed: %s", exc)
        summary["rss"] = {"error": str(exc)}

    # ── Stage 3: Scoring ─────────────────────────────────────────────────────
    try:
        from scoring.engine import score_batch
        scoring_result = score_batch([], config, sb, batch_cap=100)
        summary["scoring"] = scoring_result
    except Exception as exc:
        logger.error("Scoring stage failed: %s", exc)
        summary["scoring"] = {"error": str(exc)}

    # ── Stage 4: Slack digest ─────────────────────────────────────────────────
    try:
        from dashboard.slack_digest import send_digest
        digest_result = send_digest(sb)
        summary["digest"] = digest_result
    except Exception as exc:
        logger.error("Digest stage failed: %s", exc)
        summary["digest"] = {"error": str(exc)}

    elapsed = (datetime.now(timezone.utc) - start).total_seconds()
    summary["elapsed_seconds"] = round(elapsed, 1)
    logger.info("Pipeline complete: %s", summary)
    return summary


if __name__ == "__main__":
    result = run()
    import json
    print(json.dumps(result, indent=2, default=str))
