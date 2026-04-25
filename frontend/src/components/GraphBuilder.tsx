import type { GraphResponse } from "../types";

type Props = {
  graph: GraphResponse | null;
};

export function GraphBuilder({ graph }: Props) {
  if (!graph) {
    return <div className="panel">Select fields and click Graph.</div>;
  }

  return (
    <div className="panel">
      <h3>Graph Output (Scaffold)</h3>
      <p className="muted">
        Replace this placeholder with Plotly traces. Data contract is already wired.
      </p>
      {graph.series.map((series) => (
        <div key={series.name} className="series-row">
          <strong>{series.name}</strong>
          <span>{series.data.length} points</span>
          <span>axis: {series.y_axis}</span>
        </div>
      ))}
    </div>
  );
}
