import type { DeviceSummary, GraphResponse } from "./types";

const API_BASE = "/api";

export async function fetchDevices(): Promise<DeviceSummary[]> {
  const response = await fetch(`${API_BASE}/devices`);
  if (!response.ok) {
    throw new Error("Failed to load devices");
  }
  return response.json();
}

export async function fetchDeviceFields(deviceId: number): Promise<string[]> {
  const response = await fetch(`${API_BASE}/devices/${deviceId}/fields`);
  if (!response.ok) {
    throw new Error("Failed to load fields");
  }
  return response.json();
}

export async function fetchGraphData(params: {
  deviceId: number;
  fromIso: string;
  toIso: string;
  fields: string[];
}): Promise<GraphResponse> {
  const response = await fetch(`${API_BASE}/devices/${params.deviceId}/graph`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: params.fromIso,
      to: params.toIso,
      fields: params.fields,
      include_setpoints: true
    })
  });
  if (!response.ok) {
    throw new Error("Failed to load graph data");
  }
  return response.json();
}
