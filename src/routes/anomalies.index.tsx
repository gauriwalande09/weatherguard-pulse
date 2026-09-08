import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { SENSOR_META } from "@/lib/mock-data";
import { Chip, PageHeader, Panel, SeverityBadge, VerdictBadge } from "@/components/ui-kit";
import type { Severity } from "@/lib/types";

export const Route = createFileRoute("/anomalies/")({
  head: () => ({
    meta: [
      { title: "Anomaly Detections — WeatherGuard AI" },
      {
        name: "description",
        content:
          "Browse, filter and triage AI-detected Automatic Weather Station anomalies with severity, confidence and fault-vs-weather verdicts.",
      },
      { property: "og:title", content: "Anomaly Detections — WeatherGuard AI" },
      { property: "og:description", content: "Filter and triage AI-detected AWS sensor anomalies." },
    ],
  }),
  component: AnomalyList,
});

const SEVERITIES: (Severity | "all")[] = ["all", "critical", "high", "medium", "low"];
const VERDICTS = ["all", "sensor_fault", "genuine_weather"] as const;

function AnomalyList() {
  const [severity, setSeverity] = useState<string>("all");
  const [verdict, setVerdict] = useState<string>("all");
  const [stationId, setStationId] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"time" | "confidence" | "severity">("time");

  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => api.listStations() });
  const { data = [], isLoading } = useQuery({
    queryKey: ["anomalies", severity, verdict, stationId, q],
    queryFn: () => api.listAnomalies({ severity, verdict, stationId, q }),
  });

  const rows = useMemo(() => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...data].sort((a, b) => {
      if (sort === "confidence") return b.confidence - a.confidence;
      if (sort === "severity") return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
      return b.detectedAt.localeCompare(a.detectedAt);
    });
  }, [data, sort]);

  return (
    <>
      <PageHeader
        title="Anomaly Detections"
        description="Every flagged reading with model confidence, explainability and a fault-vs-weather verdict."
      />

      <Panel>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ID, station, anomaly type…"
              className="w-full rounded-lg border border-border bg-surface-2/60 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="rounded-lg border border-border bg-surface-2/60 px-2 py-2 text-xs"
              aria-label="Filter by station"
            >
              <option value="all">All stations</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-lg border border-border bg-surface-2/60 px-2 py-2 text-xs"
              aria-label="Sort"
            >
              <option value="time">Newest first</option>
              <option value="confidence">Highest confidence</option>
              <option value="severity">Severity</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SEVERITIES.map((s) => (
            <Chip key={s} active={severity === s} onClick={() => setSeverity(s)}>
              {s === "all" ? "All severities" : s}
            </Chip>
          ))}
          {VERDICTS.map((v) => (
            <Chip key={v} active={verdict === v} onClick={() => setVerdict(v)}>
              {v === "all" ? "All verdicts" : v === "sensor_fault" ? "Sensor fault" : "Genuine weather"}
            </Chip>
          ))}
        </div>
      </Panel>

      <Panel title={`${rows.length} detections`} subtitle={isLoading ? "Loading…" : "Click a row for full explainability"}>
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium sm:px-5">ID</th>
                <th className="px-4 py-2 font-medium">Station</th>
                <th className="px-4 py-2 font-medium">Sensor</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Deviation</th>
                <th className="px-4 py-2 font-medium">Confidence</th>
                <th className="px-4 py-2 font-medium">Severity</th>
                <th className="px-4 py-2 font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-border/60 transition-colors hover:bg-surface-2/50">
                  <td className="px-4 py-2.5 sm:px-5">
                    <Link to="/anomalies/$id" params={{ id: a.id }} className="font-medium text-teal hover:underline">
                      {a.id}
                    </Link>
                  </td>
                  <td className="max-w-40 truncate px-4 py-2.5">{a.stationName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{SENSOR_META[a.sensorType].label}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.type}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {a.deviation > 0 ? "+" : ""}
                    {a.deviation} {a.unit}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{(a.confidence * 100).toFixed(0)}%</td>
                  <td className="px-4 py-2.5">
                    <SeverityBadge severity={a.severity} />
                  </td>
                  <td className="px-4 py-2.5">
                    <VerdictBadge verdict={a.verdict} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !isLoading && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No anomalies match these filters.</p>
          )}
        </div>
      </Panel>
    </>
  );
}
