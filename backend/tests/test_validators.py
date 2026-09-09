from app.utils.validators import validate_egyptian_phone, validate_national_id


def test_valid_phone():
    ok, err = validate_egyptian_phone("01012345678")
    assert ok and err is None


def test_invalid_phone_prefix():
    ok, err = validate_egyptian_phone("02012345678")
    assert not ok


def test_invalid_phone_length():
    ok, err = validate_egyptian_phone("0101234567")
    assert not ok


def test_valid_national_id():
    ok, err = validate_national_id("29001011234567")
    assert ok and err is None


def test_invalid_national_id():
    ok, err = validate_national_id("123")
    assert not ok
