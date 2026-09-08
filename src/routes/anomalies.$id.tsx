import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Check, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { SENSOR_META } from "@/lib/mock-data";
import { Panel, PageHeader, SeverityBadge, VerdictBadge } from "@/components/ui-kit";

export const Route = createFileRoute("/anomalies/$id")({
  head: () => ({
    meta: [
      { title: "Anomaly Detail & Explainability — WeatherGuard AI" },
      {
        name: "description",
        content:
          "Full anomaly breakdown: model reasoning, feature contributions, rule checks and neighbouring-station comparison for AWS sensor readings.",
      },
      { property: "og:title", content: "Anomaly Detail & Explainability — WeatherGuard AI" },
      { property: "og:description", content: "Why the model flagged this AWS reading, and whether it is a fault or real weather." },
    ],
  }),
  component: AnomalyDetail,
});

const fmt = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function AnomalyDetail() {
  const { id } = useParams({ from: "/anomalies/$id" });
  const qc = useQueryClient();
  const { data: a, isLoading } = useQuery({ queryKey: ["anomaly", id], queryFn: () => api.getAnomaly(id) });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading detection…</p>;
  if (!a)
    return (
      <Panel title="Detection not found">
        <Link to="/anomalies" className="text-sm text-teal hover:underline">
          Back to anomalies
        </Link>
      </Panel>
    );

  const meta = SENSOR_META[a.sensorType];
  const chart = a.series.map((p) => ({
    t: fmt(p.t),
    observed: p.value,
    expected: p.expected,
    neighbours: p.neighbourMean,
  }));

  const setStatus = async (status: "acknowledged" | "resolved") => {
    await api.updateAnomalyStatus(a.id, status);
    qc.invalidateQueries({ queryKey: ["anomaly", id] });
    qc.invalidateQueries({ queryKey: ["anomalies"] });
  };

  return (
    <>
      <Link to="/anomalies" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to anomalies
      </Link>

      <PageHeader
        title={`${a.id} · ${a.type}`}
        description={`${meta.label} channel at ${a.stationName} · detected ${new Date(a.detectedAt).toUTCString()}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={a.severity} />
            <VerdictBadge verdict={a.verdict} />
            <button
              type="button"
              onClick={() => setStatus("acknowledged")}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs hover:bg-surface-2"
            >
              Acknowledge
            </button>
            <button
              type="button"
              onClick={() => setStatus("resolved")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-teal-foreground hover:opacity-90"
            >
              <Check className="h-3.5 w-3.5" /> Resolve
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: "Observed", v: `${a.observed} ${a.unit}` },
          { l: "Expected", v: `${a.expected} ${a.unit}` },
          { l: "Deviation", v: `${a.deviation > 0 ? "+" : ""}${a.deviation} ${a.unit}` },
          { l: "Model confidence", v: `${(a.confidence * 100).toFixed(0)}%` },
        ].map((s) => (
          <div key={s.l} className="panel p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums">{s.v}</p>
          </div>
        ))}
      </div>

      <Panel title="Signal timeline" subtitle="Observed reading vs model baseline vs neighbouring-station mean">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} minTickGap={30} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="observed" stroke="var(--critical)" dot={false} strokeWidth={2.2} />
              <Line type="monotone" dataKey="expected" stroke="var(--primary)" strokeDasharray="5 4" dot={false} strokeWidth={1.6} />
              <Line type="monotone" dataKey="neighbours" stroke="var(--teal)" dot={false} strokeWidth={1.8} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-critical" /> Observed</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-primary" /> Model baseline</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-teal" /> Neighbour mean</span>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Why the model flagged this" subtitle={`Model: ${a.model}`}>
          <p className="text-sm text-muted-foreground">{a.summary}</p>
          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.contributions.map((c) => ({ ...c, short: c.feature.split(" ").slice(0, 3).join(" ") }))} layout="vertical" margin={{ left: 30, right: 12 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="short" width={130} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="weight" radius={[0, 6, 6, 0]}>
                  {a.contributions.map((c, i) => (
                    <Cell key={i} fill={c.weight >= 0 ? "var(--teal)" : "var(--chart-2)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5">
            {a.contributions.map((c) => (
              <li key={c.feature} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs">
                <span className="min-w-0 truncate text-foreground">{c.feature}</span>
                <span className="shrink-0 text-muted-foreground">{c.detail}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Rule engine checks" subtitle="Deterministic quality-control layer running alongside the model">
          <ul className="space-y-2">
            {a.rules.map((r) => (
              <li key={r.rule} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg bg-surface-2/60 p-3">
                {r.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm">{r.rule}</p>
                  <p className="text-xs text-muted-foreground">{r.note}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-teal/30 bg-teal/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal">Recommended action</p>
            <p className="mt-1 text-sm text-muted-foreground">{a.recommendation}</p>
          </div>
        </Panel>
      </div>

      <Panel
        title="Sensor fault vs genuine weather"
        subtitle="Spatial consensus decides whether the reading is trusted"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            {a.neighbours.map((n) => (
              <div key={n.stationName} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-surface-2/60 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{n.stationName}</p>
                  <p className="text-xs text-muted-foreground">{n.distanceKm} km away</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {n.value} {a.unit}
                  </p>
                  <p className={`text-[11px] ${n.agrees ? "text-success" : "text-critical"}`}>
                    {n.agrees ? "agrees" : "disagrees"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div
            className={`rounded-xl border p-4 ${
              a.verdict === "sensor_fault" ? "border-critical/30 bg-critical/5" : "border-success/30 bg-success/5"
            }`}
          >
            <p className="text-sm font-semibold">
              {a.verdict === "sensor_fault" ? "Classified as an instrument fault" : "Classified as genuine weather"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {a.verdict === "sensor_fault"
                ? "The station diverged while every nearby station and co-located channel stayed on baseline. Physically implausible for a real atmospheric event at this scale, so the channel is quarantined."
                : "Nearby stations moved in the same direction within the same window and co-located channels are physically coherent, so the reading is trusted and forwarded to forecasters."}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-surface-2/70 p-3">
                <p className="text-muted-foreground">Spatial agreement</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {a.neighbours.filter((n) => n.agrees).length}/{a.neighbours.length}
                </p>
              </div>
              <div className="rounded-lg bg-surface-2/70 p-3">
                <p className="text-muted-foreground">Current status</p>
                <p className="mt-1 text-lg font-semibold capitalize">{a.status}</p>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
}
