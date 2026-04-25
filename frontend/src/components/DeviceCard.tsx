import { Link } from "react-router-dom";

import type { DeviceSummary } from "../types";

type Props = {
  device: DeviceSummary;
};

export function DeviceCard({ device }: Props) {
  const temp = typeof device.status.tempA === "number" ? (device.status.tempA as number).toFixed(1) : "--";
  const hum = typeof device.status.humA === "number" ? (device.status.humA as number).toFixed(1) : "--";
  const tempB = typeof device.status.tempB === "number" ? (device.status.tempB as number).toFixed(1) : "--";
  const humB = typeof device.status.humB === "number" ? (device.status.humB as number).toFixed(1) : "--";
  const heatSetpoint = typeof device.status.heatSetpoint === "string" ? device.status.heatSetpoint : "--";
  const fanRunTime = typeof device.status.fanOn === "string" ? device.status.fanOn : "--";
  const fanCycle = typeof device.status.fanCycle === "string" ? device.status.fanCycle : "--";
  const humRunTime = typeof device.status.humOn === "string" ? device.status.humOn : "--";
  const humCycle = typeof device.status.humCycle === "string" ? device.status.humCycle : "--";
  const humOffset = typeof device.status.humOffset === "string" ? device.status.humOffset : "--";
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
          <span className="label">Heat Setpoint</span>
          <strong>{heatSetpoint}</strong>
        </div>
        <div>
          <span className="label">Hum A</span>
          <strong>{hum} %</strong>
        </div>
        <div>
          <span className="label">Hum Offset</span>
          <strong>{humOffset}</strong>
        </div>
        <div>
          <span className="label">Hum Cyc</span>
          <strong>{humCycle}</strong>
        </div>
        <div>
          <span className="label">Hum Run Time</span>
          <strong>{humRunTime}</strong>
        </div>
        <div>
          <span className="label">Fan Cyc</span>
          <strong>{fanCycle}</strong>
        </div>
        <div>
          <span className="label">Fan Run Time</span>
          <strong>{fanRunTime}</strong>
        </div>
        <div>
          <span className="label">Temp B</span>
          <strong>{tempB} F</strong>
        </div>
        <div>
          <span className="label">Hum B</span>
          <strong>{humB} %</strong>
        </div>
      </div>
      <p className="muted">Last connected on: {lastSeenText}</p>
      <Link className="card-link" to={`/MW/device/${device.id}`}>
        Open
      </Link>
    </div>
  );
}
