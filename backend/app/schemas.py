from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DeviceSummary(BaseModel):
    id: int
    name: str
    location: str | None = None
    table_name: str
    is_online: bool = False
    last_seen: datetime | None = None
    status: dict[str, Any] = Field(default_factory=dict)


class DeviceStatus(BaseModel):
    id: int
    is_online: bool
    last_seen: datetime | None = None
    status: dict[str, Any] = Field(default_factory=dict)


class GraphSeries(BaseModel):
    name: str
    mode: str = "lines"
    y_axis: str = "left"
    data: list[dict[str, Any]] = Field(default_factory=list)


class GraphRequest(BaseModel):
    fields: list[str]
    from_iso: datetime = Field(alias="from")
    to_iso: datetime = Field(alias="to")
    include_setpoints: bool = True
    include_moving_avg: bool = False

    class Config:
        populate_by_name = True


class GraphResponse(BaseModel):
    device_id: int
    from_iso: datetime
    to_iso: datetime
    series: list[GraphSeries]
