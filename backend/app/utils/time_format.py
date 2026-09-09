from decimal import Decimal


def breakdown_hours(hours: float | Decimal) -> dict:
    total_seconds = max(0, int(float(hours) * 3600))
    h = total_seconds // 3600
    rem = total_seconds % 3600
    m = rem // 60
    s = rem % 60
    return {
        "hours": h,
        "minutes": m,
        "seconds": s,
        "total_seconds": total_seconds,
        "display": f"{h:02d}:{m:02d}:{s:02d}",
        "display_short": f"{m} د {s} ث" if h == 0 else f"{h} س {m} د {s} ث",
    }


def breakdown_seconds(total_seconds: int) -> dict:
    total_seconds = max(0, int(total_seconds))
    h = total_seconds // 3600
    rem = total_seconds % 3600
    m = rem // 60
    s = rem % 60
    return {
        "hours": h,
        "minutes": m,
        "seconds": s,
        "total_seconds": total_seconds,
        "display": f"{h:02d}:{m:02d}:{s:02d}",
        "display_short": f"{h} س {m} د {s} ث" if h > 0 else (f"{m} د {s} ث" if m > 0 else f"{s} ث"),
    }


def breakdown_minutes(minutes: int) -> dict:
    total_seconds = max(0, int(minutes) * 60)
    h = total_seconds // 3600
    rem = total_seconds % 3600
    m = rem // 60
    s = rem % 60
    return {
        "hours": h,
        "minutes": m,
        "seconds": s,
        "total_seconds": total_seconds,
        "display": f"{h:02d}:{m:02d}:{s:02d}",
        "display_short": f"{m} د {s} ث" if h == 0 else f"{h} س {m} د {s} ث",
    }
