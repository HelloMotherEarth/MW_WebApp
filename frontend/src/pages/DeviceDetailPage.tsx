import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchDeviceFields, fetchGraphData } from "../api";
import { GraphBuilder } from "../components/GraphBuilder";
import type { GraphResponse } from "../types";

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
      const result = await fetchGraphData({
        deviceId,
        fromIso: new Date(range.fromIso).toISOString(),
        toIso: new Date(range.toIso).toISOString(),
        fields: selected
      });
      setGraph(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Graph request failed");
    } finally {
      setLoading(false);
    }
  };

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
              {field}
            </label>
          ))}
        </div>

        <div className="range-row">
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
          <button
            className="card-link graph-button"
            disabled={loading || selected.length === 0}
            onClick={onGraph}
            type="button"
          >
            {loading ? "Graphing..." : "Graph"}
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <GraphBuilder graph={graph} />
    </main>
  );
}
