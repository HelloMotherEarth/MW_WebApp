import { Link } from "react-router-dom";

import type { DeviceSummary } from "../types";

type Props = {
  device: DeviceSummary;
};

export function DeviceCard({ device }: Props) {
  const temp = typeof device.status.tempA === "number" ? (device.status.tempA as number).toFixed(1) : "--";
  const hum = typeof device.status.humA === "number" ? (device.status.humA as number).toFixed(1) : "--";

  return (
    <Link className="device-card" to={`/MW/device/${device.id}`}>
      <div className="device-card-header">
        <h3>{device.name}</h3>
        <span className={device.is_online ? "badge online" : "badge offline"}>
          {device.is_online ? "Online" : "Offline"}
        </span>
      </div>
      <p className="muted">{device.location ?? "Unknown location"}</p>
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
    </Link>
  );
}
