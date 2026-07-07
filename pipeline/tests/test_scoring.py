"""Unit tests for deterministic scoring functions."""

import pytest
from scoring.engine import (
    score_urgency,
    score_effort,
    score_competition,
    score_composite,
)
from datetime import datetime, timedelta, timezone


def _deadline(days: int) -> str:
    dt = datetime.now(timezone.utc) + timedelta(days=days)
    return dt.isoformat()


# ─── score_urgency ────────────────────────────────────────────────────────────

def test_urgency_none():
    assert score_urgency(None) == 30

def test_urgency_past():
    assert score_urgency(_deadline(-1)) == 0

def test_urgency_under_7():
    assert score_urgency(_deadline(3)) == 20

def test_urgency_under_21():
    assert score_urgency(_deadline(14)) == 90

def test_urgency_under_60():
    assert score_urgency(_deadline(45)) == 100

def test_urgency_under_120():
    assert score_urgency(_deadline(90)) == 70

def test_urgency_over_120():
    assert score_urgency(_deadline(150)) == 40

def test_urgency_invalid_string():
    assert score_urgency("not-a-date") == 30


# ─── score_effort ─────────────────────────────────────────────────────────────

def test_effort_marketplace_no_value():
    assert score_effort("marketplace", None) == 85

def test_effort_federal_no_value():
    assert score_effort("federal", None) == 30

def test_effort_grant_large_value():
    assert score_effort("grant", 1_000_000) == 40 + 20  # 60

def test_effort_federal_large_value():
    assert score_effort("federal", 600_000) == 30 + 20  # 50

def test_effort_state_medium_value():
    assert score_effort("state", 200_000) == 60 + 10  # 70

def test_effort_tiny_value_penalty():
    assert score_effort("enterprise", 5_000) == max(0, 55 - 30)  # 25

def test_effort_none_type():
    assert score_effort(None, None) == 50

def test_effort_capped():
    result = score_effort("marketplace", 999_999_999)
    assert 0 <= result <= 100


# ─── score_competition ────────────────────────────────────────────────────────

def test_competition_federal_no_setaside():
    assert score_competition("federal", None) == 70

def test_competition_local_no_setaside():
    assert score_competition("local", None) == 55

def test_competition_small_business_setaside():
    assert score_competition("federal", "Small Business Set-Aside") == 50

def test_competition_8a():
    assert score_competition("state", "8(a) Business Development") == 60 - 20  # 40

def test_competition_unknown_type():
    assert score_competition("unknown", None) == 65

def test_competition_capped():
    result = score_competition("marketplace", "Small Business Set-Aside")
    assert 0 <= result <= 100


# ─── score_composite ─────────────────────────────────────────────────────────

def test_composite_default_weights():
    # fit=80, urgency=90, effort=70, competition=60
    # 80*0.5 + 90*0.2 + 70*0.2 + (100-60)*0.1 = 40+18+14+4 = 76
    assert score_composite(80, 90, 70, 60) == 76

def test_composite_all_max():
    # fit=100, urgency=100, effort=100, competition=0 (no competition)
    # 100*0.5 + 100*0.2 + 100*0.2 + (100-0)*0.1 = 50+20+20+10 = 100
    assert score_composite(100, 100, 100, 0) == 100

def test_composite_all_zero():
    # fit=0, urgency=0, effort=0, competition=100 (max competition)
    # 0 + 0 + 0 + (100-100)*0.1 = 0
    assert score_composite(0, 0, 0, 100) == 0

def test_composite_custom_weights():
    result = score_composite(50, 50, 50, 50, fit_w=1.0, urgency_w=0.0, effort_w=0.0, competition_w=0.0)
    assert result == 50

def test_composite_rounds_int():
    result = score_composite(73, 85, 65, 55)
    assert isinstance(result, int)
