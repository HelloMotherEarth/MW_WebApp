import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchDeviceFields, fetchGraphData } from "../api";
import { GraphBuilder } from "../components/GraphBuilder";
import type { GraphResponse } from "../types";

type TimePreset = "last4h" | "lastDay" | "lastWeek" | "custom";
const fieldLabelMap: Record<string, string> = {
  tempA: "Temp A",
  tempB: "Temp B",
  humA: "Hum A",
  humB: "Hum B",
  r1State: "Fan",
  r3State: "Humifier",
  r4State: "Heater",
  heatSetpoint: "Heat Setpoint"
};
const exportFieldTokenMap: Record<string, string> = {
  tempA: "Ta",
  tempB: "Tb",
  humA: "Ha",
  humB: "Hb",
  r1State: "Fn",
  r3State: "Hmfr",
  r4State: "Htr",
  heatSetpoint: "Htstpnt"
};
const exportRangeTokenMap: Record<TimePreset, string> = {
  last4h: "4hrs",
  lastDay: "day",
  lastWeek: "week",
  custom: "cstm"
};

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 60 * 60 * 1000);
  return {
    fromIso: from.toISOString().slice(0, 16),
    toIso: to.toISOString().slice(0, 16)
  };
}

export function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const deviceId = Number(params.id);
  const [fields, setFields] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [range, setRange] = useState(getDefaultRange());
  const [timePreset, setTimePreset] = useState<TimePreset>("lastDay");
  const [useMovingAvg, setUseMovingAvg] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(deviceId)) {
      return;
    }
    const loadFields = async () => {
      try {
        const data = await fetchDeviceFields(deviceId);
        setFields(data);
        setSelected(data.slice(0, 3));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load fields");
      }
    };
    void loadFields();
  }, [deviceId]);

  const onFieldChange = (field: string) => {
    setSelected((current) =>
      current.includes(field) ? current.filter((f) => f !== field) : [...current, field]
    );
  };

  const onGraph = async () => {
    setLoading(true);
    setError("");
    try {
      const now = new Date();
      let fromDate = new Date(range.fromIso);
      let toDate = new Date(range.toIso);

      if (timePreset === "last4h") {
        toDate = now;
        fromDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      } else if (timePreset === "lastDay") {
        toDate = now;
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (timePreset === "lastWeek") {
        toDate = now;
        fromDate = new Date(now.getTime() - 168 * 60 * 60 * 1000);
      }

      const result = await fetchGraphData({
        deviceId,
        fromIso: fromDate.toISOString(),
        toIso: toDate.toISOString(),
        fields: selected,
        includeSetpoints: selected.includes("heatSetpoint"),
        includeMovingAvg: useMovingAvg
      });
      setGraph(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Graph request failed");
    } finally {
      setLoading(false);
    }
  };

  const selectedExportTokens = selected
    .map((field) => exportFieldTokenMap[field])
    .filter((token): token is string => Boolean(token));
  const controllerToken = deviceId.toString().padStart(3, "0");
  const exportPrefix = `MW${controllerToken}_${exportRangeTokenMap[timePreset]}_${selectedExportTokens.join("-") || "none"}`;

  return (
    <main className="layout">
      <header className="page-header">
        <Link className="card-link nav-link" to="/MW">
          Back to Overview
        </Link>
        <h1>Controller {deviceId} Graph Builder</h1>
      </header>

      <section className="panel">
        <h3>Select Fields</h3>
        <div className="checkbox-grid">
          {fields.map((field) => (
            <label key={field}>
              <input
                type="checkbox"
                checked={selected.includes(field)}
                onChange={() => onFieldChange(field)}
              />
              {fieldLabelMap[field] ?? field}
            </label>
          ))}
        </div>

        <div className="range-row">
          <label>
            Time Range
            <select
              value={timePreset}
              onChange={(event) => setTimePreset(event.target.value as TimePreset)}
            >
              <option value="last4h">Last 4 Hours</option>
              <option value="lastDay">Last Day</option>
              <option value="lastWeek">Last Week</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {timePreset === "custom" ? (
            <>
              <label>
                From
                <input
                  type="datetime-local"
                  value={range.fromIso}
                  onChange={(event) => setRange((r) => ({ ...r, fromIso: event.target.value }))}
                />
              </label>
              <label>
                To
                <input
                  type="datetime-local"
                  value={range.toIso}
                  onChange={(event) => setRange((r) => ({ ...r, toIso: event.target.value }))}
                />
              </label>
            </>
          ) : null}
          <button
            className="card-link graph-button"
            disabled={loading || selected.length === 0}
            onClick={onGraph}
            type="button"
          >
            {loading ? "Graphing..." : "Graph"}
          </button>
          <button
            className={`card-link graph-button moving-avg-button ${useMovingAvg ? "active" : ""}`}
            onClick={() => setUseMovingAvg((current) => !current)}
            type="button"
          >
            Use Moving Avg
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <GraphBuilder graph={graph} exportPrefix={exportPrefix} />
    </main>
  );
}
