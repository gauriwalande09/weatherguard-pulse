import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEMO_SCENARIOS, SENSOR_META, SENSOR_TYPES, rng } from "./mock-data";
import type { DemoScenario, SensorType, Severity } from "./types";

export interface LivePoint {
  t: number;
  value: number;
  expected: number;
}

export interface LiveAlert {
  id: string;
  at: number;
  stationId: string;
  sensorType: SensorType;
  title: string;
  severity: Severity;
  verdict: "sensor_fault" | "genuine_weather";
  detail: string;
}

interface LiveState {
  running: boolean;
  setRunning: (v: boolean) => void;
  speed: number;
  setSpeed: (v: number) => void;
  tick: number;
  series: Record<SensorType, LivePoint[]>;
  latest: Record<SensorType, LivePoint>;
  scenarios: DemoScenario[];
  activeScenario: DemoScenario | null;
  runScenario: (id: string) => void;
  clearScenario: () => void;
  alerts: LiveAlert[];
  dismissAlert: (id: string) => void;
}

const START = Date.UTC(2026, 8, 8, 15, 0, 0);
const POINTS = 48;

function seedSeries(): Record<SensorType, LivePoint[]> {
  const out = {} as Record<SensorType, LivePoint[]>;
  for (const type of SENSOR_TYPES) {
    const meta = SENSOR_META[type];
    const r = rng(2600 + type.length * 17);
    out[type] = Array.from({ length: POINTS }).map((_, i) => {
      const expected = meta.base + Math.sin(i / 7) * meta.swing * 0.35;
      return {
        t: START + i * 60000,
        value: Number((expected + (r() - 0.5) * meta.swing * 0.18).toFixed(2)),
        expected: Number(expected.toFixed(2)),
      };
    });
  }
  return out;
}

const LiveContext = createContext<LiveState | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [tick, setTick] = useState(0);
  const [series, setSeries] = useState<Record<SensorType, LivePoint[]>>(() => seedSeries());
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const scenarioAge = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), Math.max(300, 1600 / speed));
    return () => clearInterval(id);
  }, [running, speed]);

  useEffect(() => {
    if (tick === 0) return;
    scenarioAge.current = activeScenario ? scenarioAge.current + 1 : 0;
    setSeries((prev) => {
      const next = {} as Record<SensorType, LivePoint[]>;
      for (const type of SENSOR_TYPES) {
        const meta = SENSOR_META[type];
        const arr = prev[type];
        const last = arr[arr.length - 1]!;
        const i = arr.length + tick;
        const expected = meta.base + Math.sin(i / 7) * meta.swing * 0.35;
        let value = expected + (Math.random() - 0.5) * meta.swing * 0.2;
        if (activeScenario && activeScenario.sensorType === type) {
          const age = Math.min(scenarioAge.current, 14);
          if (activeScenario.id === "flatline") value = last.value;
          else if (activeScenario.id === "drift") value = last.value + meta.swing * 0.06;
          else value = expected + meta.swing * (0.35 + age * 0.18);
        }
        next[type] = [
          ...arr.slice(1),
          { t: last.t + 60000, value: Number(value.toFixed(2)), expected: Number(expected.toFixed(2)) },
        ];
      }
      return next;
    });
  }, [tick, activeScenario]);

  const runScenario = useCallback((id: string) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === id);
    if (!scenario) return;
    scenarioAge.current = 0;
    setActiveScenario(scenario);
    setAlerts((prev) =>
      [
        {
          id: `LIVE-${Date.now()}`,
          at: Date.now(),
          stationId: scenario.stationId,
          sensorType: scenario.sensorType,
          severity: scenario.severity,
          verdict: scenario.verdict === "genuine_weather" ? ("genuine_weather" as const) : ("sensor_fault" as const),
          title: scenario.name,
          detail:
            scenario.verdict === "genuine_weather"
              ? "Neighbour consensus confirms a real weather event — reading released."
              : "No neighbour support — channel quarantined pending calibration.",
        },
        ...prev,
      ].slice(0, 8),
    );
  }, []);

  const clearScenario = useCallback(() => {
    scenarioAge.current = 0;
    setActiveScenario(null);
  }, []);

  const dismissAlert = useCallback((id: string) => setAlerts((p) => p.filter((a) => a.id !== id)), []);

  const latest = useMemo(() => {
    const out = {} as Record<SensorType, LivePoint>;
    for (const type of SENSOR_TYPES) out[type] = series[type][series[type].length - 1]!;
    return out;
  }, [series]);

  const value: LiveState = {
    running,
    setRunning,
    speed,
    setSpeed,
    tick,
    series,
    latest,
    scenarios: DEMO_SCENARIOS,
    activeScenario,
    runScenario,
    clearScenario,
    alerts,
    dismissAlert,
  };

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used inside LiveProvider");
  return ctx;
}
