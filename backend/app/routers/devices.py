from fastapi import APIRouter, HTTPException

from app.schemas import DeviceStatus, DeviceSummary, GraphRequest, GraphResponse
from app.services.device_service import (
    build_graph,
    get_device,
    get_plottable_fields,
    get_time_debug,
    list_devices,
    list_device_statuses,
    list_module_ids,
)

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=list[DeviceSummary])
def get_devices() -> list[DeviceSummary]:
    return list_devices()


@router.get("/module-ids", response_model=list[int])
def get_module_ids() -> list[int]:
    return list_module_ids()


@router.get("/status", response_model=list[DeviceStatus])
def get_devices_status() -> list[DeviceStatus]:
    return list_device_statuses()


@router.get("/{device_id}", response_model=DeviceSummary)
def get_device_summary(device_id: int) -> DeviceSummary:
    device = get_device(device_id)
    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.get("/{device_id}/fields", response_model=list[str])
def get_fields(device_id: int) -> list[str]:
    fields = get_plottable_fields(device_id)
    if not fields:
        raise HTTPException(status_code=404, detail="Device not found")
    return fields


@router.post("/{device_id}/graph", response_model=GraphResponse)
def post_graph(device_id: int, request: GraphRequest) -> GraphResponse:
    if get_device(device_id) is None:
        raise HTTPException(status_code=404, detail="Device not found")
    if not request.fields:
        raise HTTPException(status_code=400, detail="At least one field is required")
    return build_graph(device_id, request)


@router.get("/{device_id}/time-debug")
def time_debug(device_id: int) -> dict[str, str | bool | int | float | None]:
    payload = get_time_debug(device_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Device not found")
    return payload
