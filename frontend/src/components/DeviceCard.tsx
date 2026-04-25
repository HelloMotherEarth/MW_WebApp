import { Link } from "react-router-dom";

import type { DeviceSummary } from "../types";

type Props = {
  device: DeviceSummary;
};

export function DeviceCard({ device }: Props) {
  const temp = typeof device.status.tempA === "number" ? (device.status.tempA as number).toFixed(1) : "--";
  const hum = typeof device.status.humA === "number" ? (device.status.humA as number).toFixed(1) : "--";
  const lastSeenText = device.last_seen
    ? new Date(device.last_seen).toLocaleString()
    : "No recent data";

  return (
    <div className="device-card">
      <div className="device-card-header">
        <h3>{device.name}</h3>
        <span className={device.is_online ? "badge online" : "badge offline"}>
          {device.is_online ? "Online" : "Offline"}
        </span>
      </div>
      <p className="muted">{device.location ?? "No location set"}</p>
      <div className="status-grid">
        <div>
          <span className="label">Temp A</span>
          <strong>{temp} F</strong>
        </div>
        <div>
          <span className="label">Hum A</span>
          <strong>{hum} %</strong>
        </div>
      </div>
      <p className="muted">Last connected on: {lastSeenText}</p>
      <Link className="card-link" to={`/MW/device/${device.id}`}>
        Open module
      </Link>
    </div>
  );
}
