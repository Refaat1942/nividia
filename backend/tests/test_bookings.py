from datetime import date, time
from unittest.mock import MagicMock

from app.services.bookings import has_booking_conflict


def test_overlap_same_time():
    db = MagicMock()
    db.scalar.return_value = "existing-id"
    result = has_booking_conflict(db, "room-id", date(2026, 1, 1), time(10, 0), time(11, 0))
    assert result is True


def test_invalid_time_range():
    db = MagicMock()
    result = has_booking_conflict(db, "room-id", date(2026, 1, 1), time(11, 0), time(10, 0))
    assert result is True
