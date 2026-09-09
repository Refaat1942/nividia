from decimal import Decimal

from app.services.sessions import calculate_billable_hours


def test_calculate_billable_hours_zero():
    assert calculate_billable_hours(0) == Decimal("0")


def test_calculate_billable_hours_under_15_min():
    assert calculate_billable_hours(1) == Decimal("0.25")
    assert calculate_billable_hours(15) == Decimal("0.25")


def test_calculate_billable_hours_blocks():
    assert calculate_billable_hours(16) == Decimal("0.50")
    assert calculate_billable_hours(30) == Decimal("0.50")
    assert calculate_billable_hours(31) == Decimal("0.75")
    assert calculate_billable_hours(60) == Decimal("1.00")
    assert calculate_billable_hours(61) == Decimal("1.25")
