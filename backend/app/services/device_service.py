from datetime import datetime, timedelta, timezone
import os
import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.services.db import db_cursor
from app.schemas import DeviceStatus, DeviceSummary, GraphRequest, GraphResponse, GraphSeries

DEFAULT_FIELDS = [
    "tempA",
    "humA",
    "tempB",
    "humB",
    "r1State",
    "r3State",
    "r4State",
    "heatSetpoint",
]

def _resolve_timezone(name: str):
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        pass

    # Windows environments can miss IANA zone data; pytz fallback is reliable.
    try:
        import pytz

        return pytz.timezone(name)
    except Exception:
        return timezone.utc


def _attach_timezone(dt: datetime, tzinfo_obj) -> datetime:
    # pytz timezones require localize() for correct DST handling.
    if hasattr(tzinfo_obj, "localize"):
        return tzinfo_obj.localize(dt)
    return dt.replace(tzinfo=tzinfo_obj)


APP_TIMEZONE_NAME = os.getenv("APP_TIMEZONE", "America/Los_Angeles")
APP_TIMEZONE = _resolve_timezone(APP_TIMEZONE_NAME)

DB_TIMESTAMP_TIMEZONE_NAME = os.getenv("DB_TIMESTAMP_TIMEZONE", "UTC")
DB_TIMESTAMP_TIMEZONE = _resolve_timezone(DB_TIMESTAMP_TIMEZONE_NAME)


def _table_name_for_device(device_id: int) -> str:
    return f"MWController_Module_{device_id:03d}"


def list_module_ids() -> list[int]:
    pattern = re.compile(r"^MWController_Module_(\d{3})$")
    with db_cursor() as cursor:
        cursor.execute("SHOW TABLES LIKE 'MWController\\_Module\\_%'")
        rows = cursor.fetchall()
    module_ids: list[int] = []
    for row in rows:
        table_name = str(next(iter(row.values())))
        match = pattern.match(table_name)
        if match:
            module_ids.append(int(match.group(1)))
    return sorted(module_ids)


def _table_exists(device_id: int) -> bool:
    table_name = _table_name_for_device(device_id)
    with db_cursor() as cursor:
        cursor.execute("SHOW TABLES LIKE %s", (table_name,))
        return cursor.fetchone() is not None


def _get_latest_status(device_id: int) -> tuple[datetime | None, dict[str, float | int | str]]:
    table_name = _table_name_for_device(device_id)
    query = f"""
        SELECT datetime, tempA, humA, tempB, humB, r1State, r2State, r3State, r4State
        FROM {table_name}
        ORDER BY datetime DESC
        LIMIT 1
    """
    with db_cursor() as cursor:
        cursor.execute(query)
        row = cursor.fetchone()

    if not row:
        return None, {}

    raw_last_seen = row.get("datetime")
    if isinstance(raw_last_seen, datetime):
        # MySQL DATETIME is often naive; interpret in DB timezone, then convert.
        if raw_last_seen.tzinfo is None:
            last_seen = _attach_timezone(raw_last_seen, DB_TIMESTAMP_TIMEZONE).astimezone(APP_TIMEZONE)
        else:
            last_seen = raw_last_seen.astimezone(APP_TIMEZONE)
    else:
        last_seen = None

    status = {
        "tempA": row.get("tempA"),
        "humA": row.get("humA"),
        "tempB": row.get("tempB"),
        "humB": row.get("humB"),
        "r1State": row.get("r1State"),
        "r2State": row.get("r2State"),
        "r3State": row.get("r3State"),
        "r4State": row.get("r4State"),
    }
    return last_seen, status


def get_time_debug(device_id: int) -> dict[str, str | bool | int | float | None]:
    if not _table_exists(device_id):
        return {}

    table_name = _table_name_for_device(device_id)
    query = f"""
        SELECT datetime
        FROM {table_name}
        ORDER BY datetime DESC
        LIMIT 1
    """
    with db_cursor() as cursor:
        cursor.execute(query)
        row = cursor.fetchone()

    raw_value = row.get("datetime") if row else None
    if not isinstance(raw_value, datetime):
        return {
            "device_id": device_id,
            "table_name": table_name,
            "raw_db_datetime": None,
            "db_timestamp_timezone": DB_TIMESTAMP_TIMEZONE_NAME,
            "app_timezone": APP_TIMEZONE_NAME,
            "interpreted_datetime": None,
            "now_in_app_timezone": datetime.now(APP_TIMEZONE).isoformat(),
            "age_minutes": None,
            "is_online_10m": False,
        }

    if raw_value.tzinfo is None:
        interpreted = raw_value.replace(tzinfo=DB_TIMESTAMP_TIMEZONE).astimezone(APP_TIMEZONE)
    else:
        interpreted = raw_value.astimezone(APP_TIMEZONE)

    now_app = datetime.now(APP_TIMEZONE)
    age_minutes = round((now_app - interpreted).total_seconds() / 60.0, 3)

    return {
        "device_id": device_id,
        "table_name": table_name,
        "raw_db_datetime": raw_value.isoformat(),
        "db_timestamp_timezone": DB_TIMESTAMP_TIMEZONE_NAME,
        "db_timestamp_timezone_resolved": str(DB_TIMESTAMP_TIMEZONE),
        "app_timezone": APP_TIMEZONE_NAME,
        "app_timezone_resolved": str(APP_TIMEZONE),
        "interpreted_datetime": interpreted.isoformat(),
        "now_in_app_timezone": now_app.isoformat(),
        "age_minutes": age_minutes,
        "is_online_10m": age_minutes <= 10,
    }


def get_device(device_id: int) -> DeviceSummary | None:
    if not _table_exists(device_id):
        return None
    last_seen, status = _get_latest_status(device_id)
    is_online = False
    if last_seen is not None:
        is_online = (datetime.now(APP_TIMEZONE) - last_seen) <= timedelta(minutes=10)
    return DeviceSummary(
        id=device_id,
        name=f"Module {device_id:03d}",
        location=None,
        table_name=_table_name_for_device(device_id),
        is_online=is_online,
        last_seen=last_seen,
        status=status,
    )


def list_devices() -> list[DeviceSummary]:
    return [device for device in (get_device(module_id) for module_id in list_module_ids()) if device is not None]


def list_device_statuses() -> list[DeviceStatus]:
    return [
        DeviceStatus(
            id=d.id,
            is_online=d.is_online,
            last_seen=d.last_seen,
            status=d.status,
        )
        for d in list_devices()
    ]


def get_plottable_fields(device_id: int) -> list[str]:
    if get_device(device_id) is None:
        return []
    return DEFAULT_FIELDS


def build_graph(device_id: int, request: GraphRequest) -> GraphResponse:
    # Scaffold response with synthetic points so frontend wiring works
    # before SQL query logic is plugged in.
    points = []
    cursor = request.from_iso
    index = 0
    while cursor <= request.to_iso:
        points.append({"x": cursor.isoformat(), "y": 70 + (index % 10)})
        cursor += timedelta(minutes=5)
        index += 1

    series: list[GraphSeries] = []
    for field in request.fields:
        y_axis = "right" if field.startswith("r") and field.endswith("State") else "left"
        mode = "lines" if y_axis == "left" else "lines+markers"
        series.append(
            GraphSeries(
                name=field,
                mode=mode,
                y_axis=y_axis,
                data=points,
            )
        )

    return GraphResponse(
        device_id=device_id,
        from_iso=request.from_iso,
        to_iso=request.to_iso,
        series=series,
    )
