import type { GraphResponse } from "../types";
import Plot from "react-plotly.js";

type Props = {
  graph: GraphResponse | null;
};

export function GraphBuilder({ graph }: Props) {
  if (!graph) {
    return <div className="panel">Select fields and click Graph.</div>;
  }

  const traces = graph.series.map((series) => ({
    type: "scatter" as const,
    mode: "lines" as const,
    name: series.name,
    x: series.data.map((point) => point.x),
    y: series.data.map((point) => point.y),
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
            side: "right"
          },
          legend: { orientation: "h", y: 1.12 }
        }}
        style={{ width: "100%" }}
        useResizeHandler
      />
    </div>
  );
}
