import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { PageHeader, Panel, StatCard } from "@/components/ui-kit";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & Model Performance — WeatherGuard AI" },
      {
        name: "description",
        content:
          "Detection trends, anomaly type distribution, severity mix, data quality index and AI model precision/recall for the AWS network.",
      },
      { property: "og:title", content: "Analytics & Model Performance — WeatherGuard AI" },
      { property: "og:description", content: "Detection trends and model precision/recall across the AWS network." },
    ],
  }),
  component: Analytics,
});

const PIE_COLORS = ["var(--critical)", "var(--warning)", "var(--info)", "var(--muted-foreground)"];

function Analytics() {
  const { data } = useQuery({ queryKey: ["analytics"], queryFn: () => api.getAnalytics() });
  if (!data) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;

  const totalFaults = data.detectionsByDay.reduce((a, b) => a + b.faults, 0);
  const totalGenuine = data.detectionsByDay.reduce((a, b) => a + b.genuine, 0);
  const quality = data.dataQuality[data.dataQuality.length - 1]?.quality ?? 0;

  return (
    <>
      <PageHeader
        title="Analytics & Model Performance"
        description="Fourteen-day view of detections, data quality and classifier accuracy across the network."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faults detected" value={totalFaults} hint="Last 14 days" tone="critical" />
        <StatCard label="Genuine events" value={totalGenuine} hint="Confirmed by consensus" tone="success" />
        <StatCard label="Data quality index" value={`${quality}%`} tone="teal" hint="Usable records today" />
        <StatCard label="Model F1 score" value="0.925" hint="Precision 0.94 · Recall 0.91" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Detections per day" subtitle="Sensor faults vs genuine weather events">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.detectionsByDay} margin={{ left: -18, right: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} minTickGap={16} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="faults" stackId="a" fill="var(--critical)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="genuine" stackId="a" fill="var(--teal)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Data quality index" subtitle="Share of records passing all QC gates">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dataQuality} margin={{ left: -18, right: 8 }}>
                <defs>
                  <linearGradient id="q" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--teal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} minTickGap={16} />
                <YAxis domain={[85, 100]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="quality" stroke="var(--teal)" fill="url(#q)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Anomaly types" subtitle="Distribution across the network">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byType} layout="vertical" margin={{ left: 60, right: 12 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="type" width={150} stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Severity mix" subtitle="How detections are prioritised">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.bySeverity} dataKey="count" nameKey="severity" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {data.bySeverity.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Model performance" subtitle="Evaluated against the labelled validation set">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.modelMetrics.map((m) => (
            <div key={m.name} className="rounded-xl bg-surface-2/60 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{m.name}</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-teal">{m.value.toFixed(3)}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-teal" style={{ width: `${m.value * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
