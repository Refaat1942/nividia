import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.services.sessions import update_session


class _Db:
    def __init__(self, objects):
        self.objects = objects

    def get(self, _model, key):
        return self.objects.get(key)

    def flush(self):
        pass


def _session(**kw):
    start = datetime(2026, 11, 1, 9, 0, tzinfo=timezone.utc)
    base = dict(id=uuid.uuid4(), customer_id=uuid.uuid4(), room_id=None, office_id=None, notes=None,
                check_in_at=start, check_out_at=start + timedelta(hours=1), duration_minutes=60,
                hours_deducted=Decimal("1.00"), hours_transaction_id=None)
    base.update(kw)
    return SimpleNamespace(**base)


def test_move_to_another_room():
    room_id = uuid.uuid4()
    s = _session(office_id=uuid.uuid4())
    db = _Db({room_id: SimpleNamespace(id=room_id, deleted_at=None)})
    update_session(db, s, staff_id=uuid.uuid4(), fields={"room_id"}, room_id=room_id)
    assert s.room_id == room_id and s.office_id is None


def test_editing_checkout_recomputes_hours_and_transaction():
    tx_id = uuid.uuid4()
    tx = SimpleNamespace(id=tx_id, amount=Decimal("-1.00"))
    s = _session(hours_transaction_id=tx_id)
    db = _Db({tx_id: tx})
    update_session(db, s, staff_id=uuid.uuid4(), fields={"check_out_at"},
                   check_out_at=s.check_in_at + timedelta(hours=2, minutes=10))
    assert s.hours_deducted == Decimal("2.25") and tx.amount == Decimal("-2.25")
    assert s.duration_minutes == 130


def test_checkout_before_checkin_is_rejected():
    s = _session()
    with pytest.raises(ValueError):
        update_session(_Db({}), s, staff_id=uuid.uuid4(), fields={"check_out_at"},
                       check_out_at=s.check_in_at - timedelta(minutes=5))
