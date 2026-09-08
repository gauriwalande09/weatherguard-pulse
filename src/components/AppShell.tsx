import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  CircuitBoard,
  Gauge,
  Menu,
  Pause,
  Play,
  Radar,
  RadioTower,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLive } from "@/lib/live-store";
import { SeverityBadge } from "@/components/ui-kit";

const NAV = [
  { to: "/", label: "Live Dashboard", icon: Gauge },
  { to: "/anomalies", label: "Anomalies", icon: Radar },
  { to: "/sensors", label: "Sensor Health", icon: CircuitBoard },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/stations", label: "Stations", icon: RadioTower },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { running, setRunning, speed, setSpeed, alerts, dismissAlert, activeScenario, scenarios, runScenario, clearScenario } =
    useLive();

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-surface transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal glow-teal">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">WeatherGuard AI</p>
            <p className="truncate text-[11px] text-muted-foreground">SIH26073 · AWS Integrity</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-teal/12 text-teal ring-1 ring-teal/25"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mt-4 rounded-xl border border-border bg-surface-2/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Demo mode</p>
          <div className="mt-2 space-y-1.5">
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => runScenario(s.id)}
                className={cn(
                  "w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  activeScenario?.id === s.id
                    ? "bg-teal/15 text-teal"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          {activeScenario && (
            <button
              type="button"
              onClick={clearScenario}
              className="mt-2 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Stop scenario
            </button>
          )}
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-background/70 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {activeScenario ? `Demo: ${activeScenario.name}` : "Live ingestion · 8 stations · 56 channels"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRunning(!running)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground hover:bg-surface-2"
            >
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{running ? "Pause" : "Resume"}</span>
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="hidden rounded-lg border border-border bg-surface px-2 py-1.5 text-xs sm:block"
              aria-label="Simulation speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
            <div className="relative">
              <button
                type="button"
                onClick={() => setBell((v) => !v)}
                className="relative rounded-lg border border-border bg-surface p-2 text-muted-foreground hover:text-foreground"
                aria-label="Alerts"
              >
                <Bell className="h-4 w-4" />
                {alerts.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-[10px] font-semibold text-destructive-foreground">
                    {alerts.length}
                  </span>
                )}
              </button>
              {bell && (
                <div className="absolute right-0 top-11 w-80 rounded-xl border border-border bg-surface p-2 shadow-xl">
                  {alerts.length === 0 && (
                    <p className="p-3 text-xs text-muted-foreground">No live alerts. Run a demo scenario.</p>
                  )}
                  {alerts.map((a) => (
                    <div key={a.id} className="rounded-lg p-2.5 hover:bg-surface-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <p className="truncate text-xs font-medium">{a.title}</p>
                        <button type="button" onClick={() => dismissAlert(a.id)} aria-label="Dismiss">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{a.detail}</p>
                      <div className="mt-1.5">
                        <SeverityBadge severity={a.severity} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
