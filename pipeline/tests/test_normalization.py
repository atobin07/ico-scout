"""Unit tests for SAM.gov payload normalization and RSS entry normalization."""

import sys
from unittest.mock import MagicMock

# feedparser may be unavailable in some CI envs — stub it so import doesn't fail
sys.modules.setdefault("feedparser", MagicMock())

import pytest
from scrapers.sam_gov import _normalize, _keyword_match
from scrapers.rss_fetcher import _normalize_entry


# ─── SAM.gov keyword filter ───────────────────────────────────────────────────

def test_keyword_match_positive():
    matched = _keyword_match("We need an LLM solution for our agency")
    assert "llm" in matched

def test_keyword_match_case_insensitive():
    matched = _keyword_match("Artificial Intelligence Platform RFP")
    assert "artificial intelligence" in matched

def test_keyword_match_negative():
    matched = _keyword_match("Road construction and paving services")
    assert matched == []

def test_keyword_match_multi():
    matched = _keyword_match("OpenAI GPT chatbot for customer service automation")
    assert len(matched) >= 3


# ─── SAM.gov normalization ────────────────────────────────────────────────────

def _make_sam_raw(**kwargs) -> dict:
    base = {
        "noticeId": "ABC123",
        "title": "AI Machine Learning Platform Development",
        "description": "We need generative AI and LLM capabilities.",
        "departmentName": "Department of Defense",
        "type": "o",
        "naicsCode": "541511",
        "postedDate": "2026-06-01",
        "responseDeadLine": "2026-07-15T17:00:00",
        "typeOfSetAsideDescription": "",
        "solicitationNumber": "W52P1J-26-R-0001",
    }
    base.update(kwargs)
    return base


def test_normalize_basic():
    raw = _make_sam_raw()
    result = _normalize(raw)
    assert result is not None
    assert result["source"] == "sam_gov"
    assert result["source_id"] == "ABC123"
    assert result["contract_type"] == "federal"
    assert "llm" in result["keywords_matched"]


def test_normalize_keyword_filter_skips_irrelevant():
    raw = _make_sam_raw(title="Road paving services", description="Asphalt and construction")
    result = _normalize(raw)
    assert result is None


def test_normalize_naics_list():
    raw = _make_sam_raw(naicsCode=["541511", "541512"])
    result = _normalize(raw)
    assert result is not None
    assert "541511" in result["naics_codes"]
    assert "541512" in result["naics_codes"]


def test_normalize_url_format():
    raw = _make_sam_raw(noticeId="XYZ999")
    result = _normalize(raw)
    assert result["url"] == "https://sam.gov/opp/XYZ999/view"


def test_normalize_missing_deadline():
    raw = _make_sam_raw(responseDeadLine=None)
    raw.pop("responseDeadLine", None)
    result = _normalize(raw)
    assert result is not None
    assert result["response_deadline"] is None


def test_normalize_award_value():
    raw = _make_sam_raw(award={"amount": "250000"})
    result = _normalize(raw)
    assert result["estimated_value_max"] == 250000.0


# ─── RSS normalization ────────────────────────────────────────────────────────

class _FakeEntry:
    def __init__(self, title, summary, link="https://example.com/opp/1", id="opp1"):
        self.title = title
        self.summary = summary
        self.link = link
        self.id = id
        self.published_parsed = (2026, 6, 1, 0, 0, 0, 0, 0, 0)


def test_rss_normalize_match():
    entry = _FakeEntry("AI Chatbot Grant Opportunity", "This grant funds LLM research")
    result = _normalize_entry("Grants.gov", entry)
    assert result is not None
    assert result["source"] == "rss"
    assert result["agency_or_company"] == "Grants.gov"


def test_rss_normalize_no_match():
    entry = _FakeEntry("Road Construction Grant", "Asphalt paving for rural roads")
    result = _normalize_entry("Grants.gov", entry)
    assert result is None


def test_rss_normalize_source_id():
    entry = _FakeEntry("AI Grant", "LLM automation funding", id="grant-999")
    result = _normalize_entry("Grants.gov", entry)
    assert result["source_id"] == "grant-999"
