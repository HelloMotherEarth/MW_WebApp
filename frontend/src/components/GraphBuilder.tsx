import type { GraphResponse } from "../types";
import Plot from "react-plotly.js";

type Props = {
  graph: GraphResponse | null;
};

export function GraphBuilder({ graph }: Props) {
  if (!graph) {
    return <div className="panel">Select fields and click Graph.</div>;
  }

  const relayOrder = ["r4state", "r3state", "r1state"];
  const relayOffsets: Record<string, number> = {
    r1state: 0,
    r3state: 2,
    r4state: 4
  };

  const hasRelaySeries = graph.series.some((series) => relayOrder.includes(series.name.toLowerCase()));

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
    name: series.name,
    x: series.data.map((point) => point.x),
    yaxis: series.y_axis === "right" ? "y2" : "y",
    line: {
      shape: series.name.endsWith("State") ? ("hv" as const) : ("linear" as const),
      width: series.name === "heatSetpoint" ? 2.5 : 1.6,
      dash: series.name === "heatSetpoint" ? ("dash" as const) : ("solid" as const)
    }
  }));

  return (
    <div className="panel">
      <h3>Graph Output</h3>
      <Plot
        data={traces}
        layout={{
          autosize: true,
          height: 460,
          margin: { l: 56, r: 56, t: 16, b: 48 },
          xaxis: { title: { text: "Datetime" } },
          yaxis: { title: { text: "Temperature / Humidity" } },
          yaxis2: {
            title: { text: "Relay State" },
            overlaying: "y",
            side: "right",
            ...(hasRelaySeries
              ? {
                  tickmode: "array" as const,
                  tickvals: [4.5, 2.5, 0.5],
                  ticktext: ["R4", "R3", "R1"],
                  range: [-0.25, 5.25]
                }
              : {})
          },
          legend: { orientation: "h", y: 1.12 }
        }}
        style={{ width: "100%" }}
        useResizeHandler
      />
    </div>
  );
}
