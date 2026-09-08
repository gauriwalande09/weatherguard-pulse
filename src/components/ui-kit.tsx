import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { HealthStatus, Severity } from "@/lib/types";

export function Panel({
  children,
  className,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("panel p-4 sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold tracking-wide text-foreground">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const severityStyles: Record<Severity, string> = {
  critical: "bg-critical/15 text-critical border-critical/40",
  high: "bg-warning/15 text-warning border-warning/40",
  medium: "bg-info/15 text-info border-info/40",
  low: "bg-muted text-muted-foreground border-border",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize",
        severityStyles[severity],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  const fault = verdict === "sensor_fault";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        fault ? "border-critical/40 bg-critical/10 text-critical" : "border-success/40 bg-success/10 text-success",
      )}
    >
      {fault ? "Sensor fault" : verdict === "genuine_weather" ? "Genuine weather" : "Unverified"}
    </span>
  );
}

const healthStyles: Record<HealthStatus, string> = {
  healthy: "text-success",
  degrading: "text-warning",
  at_risk: "text-critical",
  failed: "text-critical",
};

export function HealthBar({ value, status }: { value: number; status: HealthStatus }) {
  const bar =
    status === "healthy" ? "bg-success" : status === "degrading" ? "bg-warning" : "bg-critical";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("w-9 shrink-0 text-right text-xs font-medium tabular-nums", healthStyles[status])}>
        {value}%
      </span>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "critical" | "success" | "teal";
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "critical"
      ? "text-critical"
      : tone === "success"
        ? "text-success"
        : tone === "teal"
          ? "text-teal"
          : "text-foreground";
  return (
    <div className="panel relative overflow-hidden p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn("mt-2 text-2xl font-semibold tabular-nums sm:text-3xl", toneClass)}>{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && <div className="shrink-0 rounded-lg bg-surface-2 p-2 text-teal">{icon}</div>}
      </div>
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-teal/50 bg-teal/15 text-teal"
          : "border-border bg-surface text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
