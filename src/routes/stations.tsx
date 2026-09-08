import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, RadioTower } from "lucide-react";
import { api } from "@/lib/api";
import { SENSOR_META } from "@/lib/mock-data";
import { Chip, HealthBar, PageHeader, Panel, StatCard } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stations")({
  head: () => ({
    meta: [
      { title: "Station Network — WeatherGuard AI" },
      {
        name: "description",
        content:
          "Map and roster of every Automatic Weather Station in the network with live status, per-channel health and last sync time.",
      },
      { property: "og:title", content: "Station Network — WeatherGuard AI" },
      { property: "og:description", content: "Live status and per-channel health for every Automatic Weather Station." },
    ],
  }),
  component: Stations,
});

const REGIONS = ["all", "North", "West", "East", "South", "North East"];

function Stations() {
  const [region, setRegion] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => api.listStations() });

  const rows = region === "all" ? stations : stations.filter((s) => s.region === region);
  const active = stations.find((s) => s.id === activeId) ?? rows[0];

  return (
    <>
      <PageHeader
        title="Station Network"
        description="Every Automatic Weather Station, its live link status and per-channel condition."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Stations" value={stations.length} icon={<RadioTower className="h-4 w-4" />} />
        <StatCard label="Online" value={stations.filter((s) => s.status === "online").length} tone="success" />
        <StatCard label="Degraded" value={stations.filter((s) => s.status === "degraded").length} tone="teal" />
        <StatCard label="Offline" value={stations.filter((s) => s.status === "offline").length} tone="critical" />
      </div>

      <Panel
        title="Network map"
        subtitle="Approximate geographic placement — marker colour shows link status"
        action={
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
                {r === "all" ? "All regions" : r}
              </Chip>
            ))}
          </div>
        }
      >
        <div className="relative h-80 w-full overflow-hidden rounded-xl border border-border bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_60%)] bg-surface-2/40">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          {rows.map((s) => {
            const left = ((s.lon - 68) / (95 - 68)) * 100;
            const top = 100 - ((s.lat - 8) / (35 - 8)) * 100;
            const tone =
              s.status === "online" ? "bg-success" : s.status === "degraded" ? "bg-warning" : "bg-critical";
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                style={{ left: `${left}%`, top: `${top}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                aria-label={s.name}
              >
                <span className={cn("block h-3 w-3 rounded-full ring-4 ring-current/10", tone)} />
                <span
                  className={cn(
                    "mt-1 hidden whitespace-nowrap rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] sm:block",
                    active?.id === s.id ? "text-teal" : "text-muted-foreground",
                  )}
                >
                  {s.code}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title={`${rows.length} stations`} subtitle="Select a station to inspect its channels">
          <ul className="space-y-2">
            {rows.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    active?.id === s.id ? "border-teal/40 bg-teal/5" : "border-border bg-surface-2/40 hover:border-teal/30",
                  )}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <MapPin className="mr-1 inline h-3 w-3" />
                        {s.state} · {s.region} · {s.code}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] capitalize",
                        s.status === "online"
                          ? "border-success/40 bg-success/10 text-success"
                          : s.status === "degraded"
                            ? "border-warning/40 bg-warning/10 text-warning"
                            : "border-critical/40 bg-critical/10 text-critical",
                      )}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-2">
                    <HealthBar
                      value={s.healthScore}
                      status={s.healthScore > 80 ? "healthy" : s.healthScore > 62 ? "degrading" : "at_risk"}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {active && (
          <Panel title={active.name} subtitle={`Installed ${new Date(active.installedOn).toDateString()} · last sync ${new Date(active.lastSync).toUTCString()}`}>
            <ul className="space-y-2">
              {active.sensors.map((sensor) => (
                <li key={sensor.id} className="rounded-lg bg-surface-2/60 p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <p className="truncate text-sm">{SENSOR_META[sensor.type].label}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-teal">
                      {sensor.value} {sensor.unit}
                    </p>
                  </div>
                  <div className="mt-2">
                    <HealthBar value={sensor.health} status={sensor.status} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {sensor.model} · drift {sensor.driftPerMonth} {sensor.unit}/mo · life {sensor.predictedFailureDays} d
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
