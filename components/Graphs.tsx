"use client";

import { HOVER_LEN, SENSOR_META } from "@/lib/config";
import { trend } from "@/lib/logic";
import { useVerde } from "./VerdeProvider";
import { Icon, LineChart } from "./ui";

const HG_W = 280;

/** Floating mini-graph shown while hovering a telemetry tile (pointer-events: none). */
export function HoverGraph() {
  const { hover, history } = useVerde();
  if (!hover || typeof window === "undefined") return null;

  const meta = SENSOR_META[hover.key];
  const series = history[hover.key].slice(-HOVER_LEN);
  const t = trend(series);
  const last = series.at(-1);
  const left = Math.max(8, Math.min(hover.x, window.innerWidth - HG_W - 12));
  const top = Math.max(8, Math.min(hover.y, window.innerHeight - 170));

  return (
    <div className="hover-graph" style={{ left, top, width: HG_W }}>
      <div className="hg-title">
        <span>{meta.label}</span>
        <span className={`delta ${t.dir}`}>{t.text}</span>
      </div>
      {series.length ? (
        <LineChart values={series} color={meta.color} height={90} className="hg-canvas" />
      ) : (
        <div className="muted small">no readings yet</div>
      )}
      <div className="hg-stats mono">
        <span>min {series.length ? Math.min(...series).toFixed(1) : "--"}</span>
        <span>last {last !== undefined ? `${last.toFixed(1)}${meta.unit}` : "--"}</span>
        <span>max {series.length ? Math.max(...series).toFixed(1) : "--"}</span>
      </div>
    </div>
  );
}

/** Click-to-expand graph of the last 10 readings. */
export function GraphModal() {
  const { graphKey, setGraphKey, history } = useVerde();
  if (!graphKey) return null;

  const meta = SENSOR_META[graphKey];
  const series = history[graphKey].slice(-HOVER_LEN);
  const t = trend(series);

  return (
    <div className="overlay" onClick={() => setGraphKey(null)}>
      <div className="sheet graph-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <h3>{meta.label} · last {HOVER_LEN} readings</h3>
          <button className="icon-btn" onClick={() => setGraphKey(null)} aria-label="Close"><Icon name="close" size={16} /></button>
        </div>
        {series.length ? (
          <LineChart values={series} color={meta.color} height={200} />
        ) : (
          <div className="muted small">no readings yet</div>
        )}
        <div className="mono small muted">
          {series.length} pts · min {series.length ? Math.min(...series).toFixed(1) : "--"} · max{" "}
          {series.length ? Math.max(...series).toFixed(1) : "--"} · <span className={`delta ${t.dir}`}>{t.text}</span>
        </div>
      </div>
    </div>
  );
}
