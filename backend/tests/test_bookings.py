from datetime import date, time
from unittest.mock import MagicMock

from app.services.bookings import _compute_free_slots, has_booking_conflict, parse_working_hours


def test_overlap_same_time():
    db = MagicMock()
    db.scalar.return_value = "existing-id"
    result = has_booking_conflict(db, "room-id", date(2026, 1, 1), time(10, 0), time(11, 0))
    assert result is True


def test_invalid_time_range():
    db = MagicMock()
    result = has_booking_conflict(db, "room-id", date(2026, 1, 1), time(11, 0), time(10, 0))
    assert result is True


def test_parse_working_hours():
    start, end = parse_working_hours("9:00-18:00")
    assert start == time(9, 0)
    assert end == time(18, 0)


def test_compute_free_slots_with_one_booking():
    free = _compute_free_slots(
        time(9, 0),
        time(18, 0),
        [(time(10, 0), time(12, 0))],
    )
    assert free == [
        {"start_time": "09:00", "end_time": "10:00"},
        {"start_time": "12:00", "end_time": "18:00"},
    ]


def test_compute_free_slots_empty_day():
    free = _compute_free_slots(time(9, 0), time(18, 0), [])
    assert free == [{"start_time": "09:00", "end_time": "18:00"}]
