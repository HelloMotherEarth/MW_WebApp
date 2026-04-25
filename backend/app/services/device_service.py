from datetime import datetime, timedelta, timezone

from app.schemas import DeviceStatus, DeviceSummary, GraphRequest, GraphResponse, GraphSeries

# Replace this with rows from your own devices/config table later.
DEVICE_REGISTRY = [
    {"id": 1, "name": "Module 001", "location": "Room A"},
    {"id": 2, "name": "Module 002", "location": "Room B"},
    {"id": 3, "name": "Module 003", "location": "Room C"},
    {"id": 4, "name": "Module 004", "location": "Room D"},
]

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


def _table_name_for_device(device_id: int) -> str:
    return f"MWController_Module_{device_id:03d}"


def list_devices() -> list[DeviceSummary]:
    now = datetime.now(timezone.utc)
    results: list[DeviceSummary] = []
    for device in DEVICE_REGISTRY:
        results.append(
            DeviceSummary(
                id=device["id"],
                name=device["name"],
                location=device["location"],
                table_name=_table_name_for_device(device["id"]),
                is_online=True,
                last_seen=now,
                status={
                    "tempA": 72.1,
                    "humA": 41.8,
                    "relay_active_count": 2,
                },
            )
        )
    return results


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


def get_device(device_id: int) -> DeviceSummary | None:
    for device in list_devices():
        if device.id == device_id:
            return device
    return None


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
