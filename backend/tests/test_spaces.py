import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models.entities import Room
from app.services.spaces import archived_number, release_deleted_number


class _Db:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self, _query):
        return SimpleNamespace(all=lambda: self.rows)

    def flush(self):
        pass


def _room(number, deleted=False):
    return SimpleNamespace(
        id=uuid.uuid4(), room_number=number, deleted_at=datetime.now(timezone.utc) if deleted else None,
    )


def test_deleted_space_frees_its_number():
    old = _room("1", deleted=True)
    release_deleted_number(_Db([old]), Room, "room_number", "1")
    assert old.room_number != "1" and old.room_number.startswith("1~del-")


def test_active_space_number_is_a_clear_error():
    with pytest.raises(HTTPException) as exc:
        release_deleted_number(_Db([_room("1")]), Room, "room_number", "1", label="رقم الغرفة")
    assert exc.value.status_code == 400 and "مستخدم بالفعل" in exc.value.detail


def test_editing_a_space_keeps_its_own_number():
    own = _room("1")
    release_deleted_number(_Db([own]), Room, "room_number", "1", exclude_id=own.id)
    assert own.room_number == "1"


def test_archived_number_fits_column():
    assert len(archived_number("x" * 50, uuid.uuid4())) <= 50
