export type DeviceSummary = {
  id: number;
  name: string;
  location?: string | null;
  table_name: string;
  is_online: boolean;
  last_seen?: string | null;
  status: Record<string, unknown>;
};

export type GraphPoint = {
  x: string;
  y: number;
};

export type GraphSeries = {
  name: string;
  mode: string;
  y_axis: "left" | "right";
  data: GraphPoint[];
};

export type GraphResponse = {
  device_id: number;
  from_iso: string;
  to_iso: string;
  series: GraphSeries[];
};
