from decimal import Decimal
from unittest.mock import MagicMock

from app.services.hours import get_customer_balance


def test_balance_calculation():
    db = MagicMock()
    db.scalar.return_value = Decimal("75")
    assert get_customer_balance(db, "test-id") == Decimal("75")
