import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, CircuitBoard, Radar, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { SENSOR_META, SENSOR_TYPES } from "@/lib/mock-data";
import { useLive } from "@/lib/live-store";
import { Panel, SeverityBadge, StatCard, VerdictBadge, PageHeader, HealthBar } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Dashboard — WeatherGuard AI" },
      {
        name: "description",
        content:
          "Real-time AI monitoring of Automatic Weather Station sensors: anomaly detection, sensor health and fault vs genuine weather classification.",
      },
      { property: "og:title", content: "Live Dashboard — WeatherGuard AI" },
      {
        property: "og:description",
        content: "Real-time AWS anomaly detection and sensor health monitoring for SIH26073.",
      },
    ],
  }),
  component: Dashboard,
});

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function Dashboard() {
  const { series, latest, activeScenario } = useLive();
  const { data: anomalies = [] } = useQuery({ queryKey: ["anomalies"], queryFn: () => api.listAnomalies() });
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => api.listStations() });

  const open = anomalies.filter((a) => a.status === "open");
  const faults = anomalies.filter((a) => a.verdict === "sensor_fault");
  const atRisk = stations.flatMap((s) => s.sensors).filter((s) => s.status === "at_risk" || s.status === "failed");
  const online = stations.filter((s) => s.status === "online").length;

  const chartData = series.temperature.map((p, i) => ({
    t: fmtTime(p.t),
    temperature: p.value,
    expected: p.expected,
    humidity: series.humidity[i]?.value,
    wind: series.wind_speed[i]?.value,
  }));

  return (
    <>
      <PageHeader
        title="Live Operations Dashboard"
        description="AI-supervised ingestion from every Automatic Weather Station, refreshed continuously."
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-xs text-teal">
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
            {activeScenario ? "Scenario running" : "Streaming"}
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open anomalies" value={open.length} hint="Awaiting triage" tone="critical" icon={<Radar className="h-4 w-4" />} />
        <StatCard label="Sensor faults isolated" value={faults.length} hint="Excluded from products" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Channels at risk" value={atRisk.length} hint="Predictive maintenance queue" tone="teal" icon={<CircuitBoard className="h-4 w-4" />} />
        <StatCard label="Stations online" value={`${online}/${stations.length}`} hint="Last sync under 5 min" tone="success" icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Live sensor stream" subtitle="Observed value vs model-expected baseline">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="tealFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--teal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} minTickGap={28} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="temperature" stroke="var(--teal)" fill="url(#tealFill)" strokeWidth={2} isAnimationActive={false} />
                <Line type="monotone" dataKey="expected" stroke="var(--primary)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Channel readings" subtitle="All seven parameters, live">
          <ul className="space-y-2">
            {SENSOR_TYPES.map((type) => {
              const meta = SENSOR_META[type];
              const point = latest[type];
              const off = Math.abs(point.value - point.expected) > meta.swing * 0.6;
              return (
                <li
                  key={type}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-surface-2/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{meta.label}</p>
                    <p className="text-[11px] text-muted-foreground">expected {point.expected.toFixed(1)} {meta.unit}</p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold tabular-nums ${off ? "text-critical" : "text-teal"}`}>
                    {point.value.toFixed(1)} {meta.unit}
                  </p>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Latest anomaly detections"
          subtitle="Ranked by severity and model confidence"
          action={
            <Link to="/anomalies" className="shrink-0 text-xs text-teal hover:underline">
              View all
            </Link>
          }
        >
          <ul className="space-y-2">
            {anomalies.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link
                  to="/anomalies/$id"
                  params={{ id: a.id }}
                  className="block rounded-lg border border-border bg-surface-2/40 p-3 transition-colors hover:border-teal/40"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {a.type} · {SENSOR_META[a.sensorType].label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.stationName} · {a.id} · confidence {(a.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SeverityBadge severity={a.severity} />
                      <VerdictBadge verdict={a.verdict} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Station health" subtitle="Composite score across all channels">
          <ul className="space-y-3">
            {stations.map((s) => (
              <li key={s.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <p className="truncate text-sm">{s.name}</p>
                  <span className="shrink-0 text-[11px] uppercase text-muted-foreground">{s.status}</span>
                </div>
                <div className="mt-1.5">
                  <HealthBar
                    value={s.healthScore}
                    status={s.healthScore > 80 ? "healthy" : s.healthScore > 62 ? "degrading" : "at_risk"}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Verification outcome" subtitle="How the classifier split today's detections">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-critical/30 bg-critical/5 p-4">
            <div className="flex items-center gap-2 text-critical">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-semibold">Instrument faults</p>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{faults.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Quarantined channels excluded from downstream forecasts and public products.
            </p>
          </div>
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-semibold">Genuine weather events</p>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{anomalies.length - faults.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmed by neighbouring stations and cross-sensor physics — released to forecasters.
            </p>
          </div>
        </div>
        <div className="mt-4 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -18, right: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} minTickGap={30} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="humidity" stroke="var(--chart-2)" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="wind" stroke="var(--chart-3)" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </>
  );
}
