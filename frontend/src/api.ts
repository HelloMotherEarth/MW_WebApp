import type { DeviceSummary, GraphResponse } from "./types";

const API_BASE = "/api";

export async function fetchDevices(): Promise<DeviceSummary[]> {
  const response = await fetch(`${API_BASE}/devices`);
  if (!response.ok) {
    throw new Error("Failed to load devices");
  }
  return response.json();
}

export async function fetchModuleIds(): Promise<number[]> {
  const response = await fetch(`${API_BASE}/devices/module-ids`);
  if (!response.ok) {
    throw new Error("Failed to load module ids");
  }
  return response.json();
}

export async function fetchDevice(deviceId: number): Promise<DeviceSummary> {
  const response = await fetch(`${API_BASE}/devices/${deviceId}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Module ${deviceId.toString().padStart(3, "0")} does not exist`);
    }
    throw new Error("Failed to load device");
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
  includeSetpoints?: boolean;
  includeMovingAvg?: boolean;
}): Promise<GraphResponse> {
  const response = await fetch(`${API_BASE}/devices/${params.deviceId}/graph`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: params.fromIso,
      to: params.toIso,
      fields: params.fields,
      include_setpoints: params.includeSetpoints ?? false,
      include_moving_avg: params.includeMovingAvg ?? false
    })
  });
  if (!response.ok) {
    throw new Error("Failed to load graph data");
  }
  return response.json();
}
