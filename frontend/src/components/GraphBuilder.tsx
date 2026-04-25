import type { GraphResponse } from "../types";
import Plot from "react-plotly.js";
import Plotly from "plotly.js-dist-min";
import { useState } from "react";

type Props = {
  graph: GraphResponse | null;
  exportPrefix?: string;
};
const fieldLabelMap: Record<string, string> = {
  tempa: "Temp A",
  tempb: "Temp B",
  huma: "Hum A",
  humb: "Hum B",
  r1state: "Fan",
  r3state: "Humifier",
  r4state: "Heater",
  heatsetpoint: "Heat Setpoint"
};

export function GraphBuilder({ graph, exportPrefix = "MW" }: Props) {
  const [graphDiv, setGraphDiv] = useState<Plotly.PlotlyHTMLElement | null>(null);

  if (!graph) {
    return <div className="panel">Select fields and click Graph.</div>;
  }

  const toLocalDate = (isoValue: string) => new Date(isoValue);
  const buildExportFilename = () => {
    const now = new Date();
    const pad2 = (value: number) => value.toString().padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}`;
    return `${exportPrefix}_${stamp}`;
  };

  const onExport = async () => {
    if (!graphDiv) {
      return;
    }
    await Plotly.downloadImage(graphDiv, {
      format: "png",
      filename: buildExportFilename(),
      width: 1500,
      height: 850,
      scale: 2
    });
  };

  const relayOrder = ["r4state", "r3state", "r1state"];
  const relayOffsets: Record<string, number> = {
    r1state: 0,
    r3state: 2,
    r4state: 4
  };

  const hasRelaySeries = graph.series.some((series) => relayOrder.includes(series.name.toLowerCase()));
  const colorBySeries: Record<string, string> = {
    tempa: "#ff0000",
    huma: "#0000ff",
    tempb: "#ff9aa2",
    humb: "#8ec5ff",
    r1state: "#16a34a",
    r3state: "#1e3a8a",
    r4state: "#7f1d1d",
    heatsetpoint: "#f59e0b"
  };

  const traces = graph.series.map((series) => ({
    ...(series.name.toLowerCase().endsWith("state")
      ? {
          y: series.data.map((point) => {
            const relayKey = series.name.toLowerCase();
            const offset = relayOffsets[relayKey] ?? 0;
            return point.y + offset;
          })
        }
      : {
          y: series.data.map((point) => point.y)
        }),
    type: "scatter" as const,
    mode: "lines" as const,
    name: fieldLabelMap[series.name.toLowerCase()] ?? series.name,
    x: series.data.map((point) => toLocalDate(point.x)),
    yaxis: series.y_axis === "right" ? "y2" : "y",
    line: {
      shape:
        series.name.endsWith("State") || series.name === "heatSetpoint"
          ? ("hv" as const)
          : ("linear" as const),
      width: series.name === "heatSetpoint" ? 2.5 : 1.6,
      dash: series.name === "heatSetpoint" ? ("dash" as const) : ("solid" as const),
      color: colorBySeries[series.name.toLowerCase()] ?? "#334155"
    }
  }));

  return (
    <div className="panel">
      <div className="graph-header-row">
        <h3>Graph Output</h3>
        <button className="card-link graph-button export-button" onClick={() => void onExport()} type="button">
          Export Graph
        </button>
      </div>
      <Plot
        data={traces}
        onInitialized={(_, div) => setGraphDiv(div)}
        onUpdate={(_, div) => setGraphDiv(div)}
        layout={{
          autosize: true,
          height: 460,
          margin: { l: 56, r: 56, t: 16, b: 48 },
          xaxis: {
            title: { text: "Datetime" },
            range: [toLocalDate(graph.from_iso), toLocalDate(graph.to_iso)]
          },
          yaxis: { title: { text: "Temperature / Humidity" } },
          yaxis2: {
            overlaying: "y",
            side: "right",
            ...(hasRelaySeries
              ? {
                  tickmode: "array" as const,
                  tickvals: [4.5, 2.5, 0.5],
                  ticktext: ["Heater", "Humifier", "Fan"],
                  range: [-0.25, 5.25]
                }
              : {})
          },
          annotations: hasRelaySeries
            ? [
                {
                  xref: "paper",
                  yref: "paper",
                  x: 1.02,
                  y: 1.06,
                  text: "Relays",
                  showarrow: false,
                  font: { size: 12, color: "#334155" }
                }
              ]
            : [],
          legend: { orientation: "h", y: 1.12 }
        }}
        style={{ width: "100%" }}
        useResizeHandler
      />
    </div>
  );
}
