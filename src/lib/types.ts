export type SensorType =
  | "temperature"
  | "humidity"
  | "pressure"
  | "wind_speed"
  | "wind_direction"
  | "rainfall"
  | "solar_radiation";

export type Severity = "critical" | "high" | "medium" | "low";
export type HealthStatus = "healthy" | "degrading" | "at_risk" | "failed";
export type StationStatus = "online" | "degraded" | "offline";
export type AnomalyVerdict = "sensor_fault" | "genuine_weather" | "unverified";

export interface Station {
  id: string;
  name: string;
  code: string;
  region: string;
  state: string;
  lat: number;
  lon: number;
  status: StationStatus;
  installedOn: string;
  lastSync: string;
  healthScore: number;
  sensors: Sensor[];
}

export interface Sensor {
  id: string;
  stationId: string;
  type: SensorType;
  model: string;
  unit: string;
  health: number;
  status: HealthStatus;
  driftPerMonth: number;
  noiseIndex: number;
  uptime: number;
  lastCalibrated: string;
  predictedFailureDays: number;
  value: number;
}

export interface Reading {
  t: number;
  value: number;
  expected: number;
  neighbourMean: number;
}

export interface FeatureContribution {
  feature: string;
  weight: number;
  detail: string;
}

export interface Anomaly {
  id: string;
  stationId: string;
  stationName: string;
  sensorId: string;
  sensorType: SensorType;
  detectedAt: string;
  type: string;
  severity: Severity;
  confidence: number;
  verdict: AnomalyVerdict;
  observed: number;
  expected: number;
  deviation: number;
  unit: string;
  model: string;
  status: "open" | "acknowledged" | "resolved";
  summary: string;
  recommendation: string;
  contributions: FeatureContribution[];
  rules: { rule: string; passed: boolean; note: string }[];
  series: Reading[];
  neighbours: { stationName: string; distanceKm: number; value: number; agrees: boolean }[];
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  sensorType: SensorType;
  stationId: string;
  severity: Severity;
  verdict: AnomalyVerdict;
}
