import type {
  Anomaly,
  DemoScenario,
  Reading,
  Sensor,
  SensorType,
  Severity,
  Station,
} from "./types";

/** Deterministic pseudo-random so SSR and client agree. */
export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export const SENSOR_META: Record<
  SensorType,
  { label: string; unit: string; base: number; swing: number; model: string }
> = {
  temperature: { label: "Temperature", unit: "°C", base: 29, swing: 6, model: "PT-1000 RTD" },
  humidity: { label: "Humidity", unit: "%", base: 62, swing: 18, model: "HYT-271" },
  pressure: { label: "Pressure", unit: "hPa", base: 1008, swing: 6, model: "BMP-390" },
  wind_speed: { label: "Wind Speed", unit: "m/s", base: 4.5, swing: 3.5, model: "Anemo-3C" },
  wind_direction: { label: "Wind Direction", unit: "°", base: 180, swing: 120, model: "WV-220" },
  rainfall: { label: "Rainfall", unit: "mm", base: 1.2, swing: 2.4, model: "TB-4 Tipping" },
  solar_radiation: {
    label: "Solar Radiation",
    unit: "W/m²",
    base: 640,
    swing: 240,
    model: "SP-510 Pyra",
  },
};

export const SENSOR_TYPES = Object.keys(SENSOR_META) as SensorType[];

const STATION_SEED = [
  { name: "Pune Shivajinagar", code: "AWS-PNQ-01", region: "West", state: "Maharashtra", lat: 18.53, lon: 73.85 },
  { name: "Nashik Ozar", code: "AWS-ISK-04", region: "West", state: "Maharashtra", lat: 20.11, lon: 73.91 },
  { name: "Jaipur Sanganer", code: "AWS-JAI-02", region: "North", state: "Rajasthan", lat: 26.82, lon: 75.8 },
  { name: "Guwahati Borjhar", code: "AWS-GAU-07", region: "North East", state: "Assam", lat: 26.1, lon: 91.58 },
  { name: "Bhubaneswar Coastal", code: "AWS-BBI-03", region: "East", state: "Odisha", lat: 20.25, lon: 85.82 },
  { name: "Coimbatore Peelamedu", code: "AWS-CJB-05", region: "South", state: "Tamil Nadu", lat: 11.03, lon: 77.04 },
  { name: "Leh Spituk", code: "AWS-IXL-09", region: "North", state: "Ladakh", lat: 34.14, lon: 77.54 },
  { name: "Kochi Nedumbassery", code: "AWS-COK-06", region: "South", state: "Kerala", lat: 10.15, lon: 76.4 },
];

function healthStatus(h: number): Sensor["status"] {
  if (h >= 88) return "healthy";
  if (h >= 70) return "degrading";
  if (h >= 45) return "at_risk";
  return "failed";
}

export const STATIONS: Station[] = STATION_SEED.map((s, i) => {
  const r = rng(101 + i * 37);
  const sensors: Sensor[] = SENSOR_TYPES.map((type, j) => {
    const meta = SENSOR_META[type];
    const health = Math.round(42 + r() * 57);
    const days = Math.round(3 + (health / 100) * 170);
    return {
      id: `${s.code}-${type}`,
      stationId: s.code,
      type,
      model: meta.model,
      unit: meta.unit,
      health,
      status: healthStatus(health),
      driftPerMonth: Number((r() * 1.4 - 0.3).toFixed(2)),
      noiseIndex: Number((r() * 0.9).toFixed(2)),
      uptime: Number((95 + r() * 5).toFixed(2)),
      lastCalibrated: new Date(2026, 1 + (j % 6), 3 + j).toISOString(),
      predictedFailureDays: days,
      value: Number((meta.base + (r() - 0.5) * meta.swing).toFixed(1)),
    };
  });
  const healthScore = Math.round(sensors.reduce((a, b) => a + b.health, 0) / sensors.length);
  const status: Station["status"] = healthScore > 80 ? "online" : healthScore > 62 ? "degraded" : "offline";
  return {
    id: s.code,
    code: s.code,
    name: s.name,
    region: s.region,
    state: s.state,
    lat: s.lat,
    lon: s.lon,
    status,
    installedOn: new Date(2021, i % 12, 12).toISOString(),
    lastSync: new Date(2026, 8, 8, 15, 30 - i).toISOString(),
    healthScore,
    sensors,
  };
});

export function buildSeries(
  seed: number,
  type: SensorType,
  faulty: boolean,
  neighbourAgrees: boolean,
  points = 72,
): Reading[] {
  const meta = SENSOR_META[type];
  const r = rng(seed);
  const out: Reading[] = [];
  const start = Date.UTC(2026, 8, 8, 4, 0, 0);
  for (let i = 0; i < points; i++) {
    const wave = Math.sin(i / 9) * meta.swing * 0.45;
    const expected = meta.base + wave;
    const neighbourMean = expected + (r() - 0.5) * meta.swing * 0.12;
    let value = expected + (r() - 0.5) * meta.swing * 0.16;
    if (i > points - 18) {
      const t = (i - (points - 18)) / 18;
      if (faulty) value = expected + t * meta.swing * (2.6 + r() * 0.6);
      else value = expected + t * meta.swing * 1.9;
      if (!faulty && neighbourAgrees) {
        out.forEach(() => undefined);
      }
    }
    const nm =
      !faulty && i > points - 18
        ? value + (r() - 0.5) * meta.swing * 0.2
        : neighbourMean;
    out.push({
      t: start + i * 10 * 60 * 1000,
      value: Number(value.toFixed(2)),
      expected: Number(expected.toFixed(2)),
      neighbourMean: Number(nm.toFixed(2)),
    });
  }
  return out;
}

const ANOMALY_TYPES = [
  "Spike / Outlier",
  "Flatline (Stuck Value)",
  "Sensor Drift",
  "Range Violation",
  "Cross-Sensor Inconsistency",
  "Missing Data Burst",
  "Excessive Noise",
];

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function contributions(type: string, faulty: boolean) {
  const base = [
    { feature: "Deviation from forecast baseline", weight: 0.34, detail: "z-score 4.8 over 60 min window" },
    { feature: "Neighbour station agreement", weight: faulty ? 0.27 : -0.24, detail: faulty ? "3 of 3 neighbours disagree" : "3 of 3 neighbours confirm the change" },
    { feature: "Cross-sensor physical consistency", weight: faulty ? 0.18 : -0.12, detail: faulty ? "Humidity & pressure did not move together" : "Pressure drop matches wind surge" },
    { feature: "Signal noise / variance profile", weight: 0.12, detail: "Rolling variance 3.1x baseline" },
    { feature: "Historic sensor drift record", weight: 0.09, detail: "0.42 units/month uncorrected drift" },
  ];
  if (type.startsWith("Flatline")) base[3] = { feature: "Zero variance run length", weight: 0.29, detail: "48 identical samples in a row" };
  return base;
}

export const ANOMALIES: Anomaly[] = Array.from({ length: 34 }).map((_, i) => {
  const r = rng(9001 + i * 53);
  const station = STATIONS[i % STATIONS.length]!;
  const type = ANOMALY_TYPES[i % ANOMALY_TYPES.length]!;
  const sensorType = SENSOR_TYPES[(i * 3) % SENSOR_TYPES.length]!;
  const meta = SENSOR_META[sensorType];
  const faulty = i % 3 !== 1;
  const severity = SEVERITIES[i % 4]!;
  const series = buildSeries(400 + i, sensorType, faulty, !faulty);
  const last = series[series.length - 1]!;
  const detected = new Date(Date.UTC(2026, 8, 8, 6 + (i % 10), (i * 7) % 60));
  return {
    id: `ANM-${(2401 + i).toString()}`,
    stationId: station.id,
    stationName: station.name,
    sensorId: `${station.code}-${sensorType}`,
    sensorType,
    detectedAt: detected.toISOString(),
    type,
    severity,
    confidence: Number((0.68 + r() * 0.31).toFixed(2)),
    verdict: faulty ? "sensor_fault" : "genuine_weather",
    observed: last.value,
    expected: last.expected,
    deviation: Number((last.value - last.expected).toFixed(2)),
    unit: meta.unit,
    model: faulty ? "Isolation Forest + LSTM residual" : "LSTM residual + spatial consensus",
    status: (["open", "acknowledged", "resolved"] as const)[i % 3]!,
    summary: faulty
      ? `${meta.label} channel diverged from the forecast baseline while every neighbouring station stayed nominal — signature of an instrument fault, not weather.`
      : `${meta.label} shifted sharply, and neighbouring stations plus co-located sensors moved in the same direction — consistent with a real weather event.`,
    recommendation: faulty
      ? "Flag channel as untrusted, exclude from downstream products and schedule a field calibration visit."
      : "No maintenance needed. Release the reading and raise a nowcast advisory for the region.",
    contributions: contributions(type, faulty),
    rules: [
      { rule: "Physical range check", passed: severity !== "critical", note: `${meta.label} within instrument limits` },
      { rule: "Step-change threshold", passed: false, note: "Δ exceeds 3σ in 30 minutes" },
      { rule: "Spatial consensus", passed: !faulty, note: faulty ? "Neighbours disagree" : "Neighbours agree" },
      { rule: "Cross-sensor coherence", passed: !faulty, note: faulty ? "Incoherent with humidity/pressure" : "Coherent" },
      { rule: "Persistence check", passed: true, note: "Event persisted over 4 samples" },
    ],
    series,
    neighbours: STATIONS.filter((s) => s.id !== station.id)
      .slice(0, 3)
      .map((s, k) => ({
        stationName: s.name,
        distanceKm: Math.round(28 + k * 31 + r() * 12),
        value: Number((meta.base + (faulty ? (r() - 0.5) * 1.2 : last.value - meta.base) * 0.9).toFixed(2)),
        agrees: !faulty,
      })),
  };
});

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "spike",
    name: "Temperature spike (fault)",
    description: "Injects a 12°C impossible jump on Pune while neighbours stay flat.",
    sensorType: "temperature",
    stationId: "AWS-PNQ-01",
    severity: "critical",
    verdict: "sensor_fault",
  },
  {
    id: "flatline",
    name: "Humidity flatline (fault)",
    description: "Humidity sensor freezes at a constant value for 40 minutes.",
    sensorType: "humidity",
    stationId: "AWS-ISK-04",
    severity: "high",
    verdict: "sensor_fault",
  },
  {
    id: "drift",
    name: "Pressure drift (fault)",
    description: "Slow multi-hour barometric drift that rule engines usually miss.",
    sensorType: "pressure",
    stationId: "AWS-JAI-02",
    severity: "medium",
    verdict: "sensor_fault",
  },
  {
    id: "squall",
    name: "Genuine squall line",
    description: "Real wind surge confirmed by three neighbouring stations.",
    sensorType: "wind_speed",
    stationId: "AWS-BBI-03",
    severity: "high",
    verdict: "genuine_weather",
  },
  {
    id: "cloudburst",
    name: "Genuine cloudburst",
    description: "Rainfall surge coherent with pressure drop and humidity rise.",
    sensorType: "rainfall",
    stationId: "AWS-COK-06",
    severity: "critical",
    verdict: "genuine_weather",
  },
];

export const ANALYTICS = {
  detectionsByDay: Array.from({ length: 14 }).map((_, i) => {
    const r = rng(77 + i);
    return {
      day: `Sep ${i + 1}`,
      faults: Math.round(4 + r() * 12),
      genuine: Math.round(2 + r() * 8),
    };
  }),
  byType: ANOMALY_TYPES.map((type, i) => ({
    type,
    count: 8 + ((i * 7) % 23),
  })),
  bySeverity: SEVERITIES.map((severity, i) => ({
    severity,
    count: [18, 26, 34, 41][i],
  })),
  modelMetrics: [
    { name: "Precision", value: 0.94 },
    { name: "Recall", value: 0.91 },
    { name: "F1 score", value: 0.925 },
    { name: "False positive rate", value: 0.06 },
  ],
  dataQuality: Array.from({ length: 14 }).map((_, i) => {
    const r = rng(303 + i);
    return { day: `Sep ${i + 1}`, quality: Number((91 + r() * 8).toFixed(1)) };
  }),
};
