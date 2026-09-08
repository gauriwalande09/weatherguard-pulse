import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { SENSOR_META } from "@/lib/mock-data";
import { Chip, HealthBar, PageHeader, Panel, StatCard } from "@/components/ui-kit";
import type { Sensor } from "@/lib/types";

export const Route = createFileRoute("/sensors")({
  head: () => ({
    meta: [
      { title: "Sensor Health & Predictive Maintenance — WeatherGuard AI" },
      {
        name: "description",
        content:
          "Track drift, noise, uptime and predicted remaining life for every Automatic Weather Station sensor channel, with a prioritised maintenance queue.",
      },
      { property: "og:title", content: "Sensor Health & Predictive Maintenance — WeatherGuard AI" },
      { property: "og:description", content: "Drift, noise and remaining-life forecasts for every AWS sensor channel." },
    ],
  }),
  component: SensorHealth,
});

const STATUS_FILTERS = ["all", "healthy", "degrading", "at_risk", "failed"] as const;

function SensorHealth() {
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Sensor | null>(null);
  const { data: sensors = [] } = useQuery({ queryKey: ["sensors"], queryFn: () => api.listSensors() });

  const rows = useMemo(
    () => (status === "all" ? sensors : sensors.filter((s) => s.status === status)),
    [sensors, status],
  );
  const queue = useMemo(
    () => [...sensors].sort((a, b) => a.predictedFailureDays - b.predictedFailureDays).slice(0, 8),
    [sensors],
  );
  const avgHealth = sensors.length
    ? Math.round(sensors.reduce((a, b) => a + b.health, 0) / sensors.length)
    : 0;

  const driftChart = queue.map((s) => ({
    name: `${s.stationId.split("-")[1]} ${SENSOR_META[s.type].label.slice(0, 8)}`,
    days: s.predictedFailureDays,
    health: s.health,
  }));

  return (
    <>
      <PageHeader
        title="Sensor Health & Predictive Maintenance"
        description="Degradation models score every channel and forecast when it needs a field visit."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Channels monitored" value={sensors.length} hint="Across 8 stations" />
        <StatCard label="Average health" value={`${avgHealth}%`} tone="teal" />
        <StatCard
          label="Needs attention"
          value={sensors.filter((s) => s.status === "at_risk" || s.status === "failed").length}
          tone="critical"
          hint="At risk or failed"
        />
        <StatCard
          label="Next service due"
          value={`${queue[0]?.predictedFailureDays ?? 0} d`}
          hint={queue[0] ? `${queue[0].stationId} · ${SENSOR_META[queue[0].type].label}` : ""}
          icon={<Wrench className="h-4 w-4" />}
        />
      </div>

      <Panel title="Predicted remaining life" subtitle="Lowest-life channels first — the maintenance queue">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={driftChart} margin={{ left: -18, right: 8, bottom: 30 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} angle={-25} textAnchor="end" interval={0} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="days" radius={[6, 6, 0, 0]}>
                {driftChart.map((d, i) => (
                  <Cell key={i} fill={d.days < 30 ? "var(--critical)" : d.days < 80 ? "var(--warning)" : "var(--teal)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel
        title="All sensor channels"
        subtitle="Select a channel for calibration detail"
        action={
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                {s === "all" ? "All" : s.replace("_", " ")}
              </Chip>
            ))}
          </div>
        }
      >
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium sm:px-5">Channel</th>
                <th className="px-4 py-2 font-medium">Station</th>
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Health</th>
                <th className="px-4 py-2 font-medium">Drift / mo</th>
                <th className="px-4 py-2 font-medium">Noise</th>
                <th className="px-4 py-2 font-medium">Uptime</th>
                <th className="px-4 py-2 font-medium">Life left</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="cursor-pointer border-b border-border/60 transition-colors hover:bg-surface-2/50"
                >
                  <td className="px-4 py-2.5 font-medium sm:px-5">{SENSOR_META[s.type].label}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.stationId}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.model}</td>
                  <td className="w-40 px-4 py-2.5">
                    <HealthBar value={s.health} status={s.status} />
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{s.driftPerMonth} {s.unit}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.noiseIndex}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.uptime}%</td>
                  <td className={`px-4 py-2.5 tabular-nums ${s.predictedFailureDays < 30 ? "text-critical" : ""}`}>
                    {s.predictedFailureDays} d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4" onClick={() => setSelected(null)}>
          <div className="panel w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">
              {SENSOR_META[selected.type].label} · {selected.stationId}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{selected.model} · channel {selected.id}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Detail k="Health score" v={`${selected.health}%`} />
              <Detail k="Status" v={selected.status.replace("_", " ")} />
              <Detail k="Drift per month" v={`${selected.driftPerMonth} ${selected.unit}`} />
              <Detail k="Noise index" v={String(selected.noiseIndex)} />
              <Detail k="Uptime" v={`${selected.uptime}%`} />
              <Detail k="Predicted life" v={`${selected.predictedFailureDays} days`} />
              <Detail k="Last calibrated" v={new Date(selected.lastCalibrated).toDateString()} />
              <Detail k="Last reading" v={`${selected.value} ${selected.unit}`} />
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-5 w-full rounded-lg bg-teal py-2 text-sm font-medium text-teal-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-surface-2/60 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</p>
      <p className="mt-1 truncate font-medium capitalize">{v}</p>
    </div>
  );
}
