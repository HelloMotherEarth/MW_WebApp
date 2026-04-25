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
GRAPHABLE_COLUMN_MAP = {
    "tempA": "tempA",
    "humA": "humA",
    "tempB": "tempB",
    "humB": "humB",
    "r1State": "r1State",
    "r2State": "r2State",
    "r3State": "r3State",
    "r4State": "r4State",
}

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


def _extract_config_value(config_text: str, label: str, unit: str | None = None) -> str | None:
    if unit:
        pattern = rf"{re.escape(label)}:\s*([\d.]+)\s*{re.escape(unit)}"
        match = re.search(pattern, config_text, flags=re.IGNORECASE)
        if match:
            return f"{match.group(1)} {unit}"
        return None

    pattern = rf"{re.escape(label)}:\s*([^,]+)"
    match = re.search(pattern, config_text, flags=re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def _extract_config_float(config_text: str, label: str) -> float | None:
    pattern = rf"{re.escape(label)}:\s*([\d.]+)"
    match = re.search(pattern, config_text, flags=re.IGNORECASE)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _normalize_db_datetime(raw_dt: datetime) -> datetime:
    if raw_dt.tzinfo is None:
        return _attach_timezone(raw_dt, DB_TIMESTAMP_TIMEZONE).astimezone(APP_TIMEZONE)
    return raw_dt.astimezone(APP_TIMEZONE)


def _to_db_naive(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(DB_TIMESTAMP_TIMEZONE).replace(tzinfo=None)


def _get_latest_status(device_id: int) -> tuple[datetime | None, dict[str, float | int | str]]:
    table_name = _table_name_for_device(device_id)
    query = f"""
        SELECT datetime, tempA, humA, tempB, humB, r1State, r2State, r3State, r4State, configValues
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
        last_seen = _normalize_db_datetime(raw_last_seen)
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

    config_values = row.get("configValues")
    if isinstance(config_values, str) and config_values.strip():
        status["heatSetpoint"] = _extract_config_value(config_values, "Heat Setpoint", "F")
        status["fanOn"] = _extract_config_value(config_values, "Fan On", "sec")
        status["fanCycle"] = _extract_config_value(config_values, "Fan Cyc", "min")
        status["humOn"] = _extract_config_value(config_values, "Hum On", "sec")
        status["humCycle"] = _extract_config_value(config_values, "Hum Cyc", "min")
        status["humOffset"] = _extract_config_value(config_values, "Hum Offset", "min")

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
        name=f"Controller {device_id:03d}",
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
    table_name = _table_name_for_device(device_id)
    requested = [field for field in request.fields if field in DEFAULT_FIELDS]
    now_app = datetime.now(APP_TIMEZONE)
    effective_to = request.to_iso if request.to_iso <= now_app else now_app
    effective_from = request.from_iso if request.from_iso <= effective_to else effective_to

    db_start = _to_db_naive(effective_from)
    db_end = _to_db_naive(effective_to)

    column_fields = [field for field in requested if field in GRAPHABLE_COLUMN_MAP]
    rows: list[dict] = []
    if column_fields:
        select_columns = ", ".join([GRAPHABLE_COLUMN_MAP[field] for field in column_fields])
        query = f"""
            SELECT datetime, {select_columns}
            FROM {table_name}
            WHERE datetime BETWEEN %s AND %s
            ORDER BY datetime
        """
        with db_cursor() as cursor:
            cursor.execute(query, (db_start, db_end))
            rows = cursor.fetchall()

    series: list[GraphSeries] = []
    for field in column_fields:
        y_axis = "right" if field.startswith("r") and field.endswith("State") else "left"
        points: list[dict[str, float | str]] = []
        for row in rows:
            raw_dt = row.get("datetime")
            value = row.get(GRAPHABLE_COLUMN_MAP[field])
            if not isinstance(raw_dt, datetime) or value is None:
                continue
            try:
                numeric_value = float(value)
            except (TypeError, ValueError):
                continue
            points.append({"x": _normalize_db_datetime(raw_dt).isoformat(), "y": numeric_value})
        series.append(
            GraphSeries(
                name=field,
                mode="lines",
                y_axis=y_axis,
                data=points,
            )
        )

    if request.include_setpoints and "heatSetpoint" in requested:
        cfg_query = f"""
            SELECT datetime, configValues
            FROM (
                SELECT datetime, configValues
                FROM {table_name}
                WHERE datetime < %s
                  AND configValues IS NOT NULL
                  AND configValues <> ''
                ORDER BY datetime DESC
                LIMIT 1
            ) AS before_range
            UNION ALL
            SELECT datetime, configValues
            FROM {table_name}
            WHERE datetime BETWEEN %s AND %s
              AND configValues IS NOT NULL
              AND configValues <> ''
            ORDER BY datetime
        """
        with db_cursor() as cursor:
            cursor.execute(cfg_query, (db_start, db_start, db_end))
            cfg_rows = cursor.fetchall()

        setpoint_points: list[dict[str, float | str]] = []
        last_value: float | None = None
        for row in cfg_rows:
            raw_dt = row.get("datetime")
            config_values = row.get("configValues")
            if not isinstance(raw_dt, datetime) or not isinstance(config_values, str):
                continue
            setpoint = _extract_config_float(config_values, "Heat Setpoint")
            if setpoint is None:
                continue
            if last_value is not None and abs(last_value - setpoint) < 1e-9:
                continue
            last_value = setpoint
            normalized_dt = _normalize_db_datetime(raw_dt)
            point_x = normalized_dt
            if normalized_dt < request.from_iso:
                # Anchor the carried-forward setpoint at graph start.
                point_x = effective_from
            setpoint_points.append({"x": point_x.isoformat(), "y": setpoint})

        # Carry the last known setpoint to the end of the selected range
        # so the step line does not stop at the final change timestamp.
        if setpoint_points and last_value is not None:
            last_point_x = setpoint_points[-1]["x"]
            if isinstance(last_point_x, str):
                try:
                    last_point_dt = datetime.fromisoformat(last_point_x)
                except ValueError:
                    last_point_dt = effective_to
            else:
                last_point_dt = effective_to
            if last_point_dt < effective_to:
                setpoint_points.append({"x": effective_to.isoformat(), "y": last_value})

        series.append(
            GraphSeries(
                name="heatSetpoint",
                mode="lines",
                y_axis="left",
                data=setpoint_points,
            )
        )

    return GraphResponse(
        device_id=device_id,
        from_iso=effective_from,
        to_iso=effective_to,
        series=series,
    )
