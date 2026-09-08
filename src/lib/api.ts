/**
 * Backend-ready service layer.
 *
 * Every screen talks to this module only. Today it resolves from mock data,
 * but each function has the shape of a real HTTP call — swap the body for
 * `fetch(`${API_BASE}/...`)` and the UI keeps working unchanged.
 */
import { ANALYTICS, ANOMALIES, DEMO_SCENARIOS, SENSOR_META, STATIONS, buildSeries } from "./mock-data";
import type { Anomaly, Reading, Sensor, SensorType, Station } from "./types";

export const API_BASE = (import.meta as { env?: Record<string, string> }).env?.["VITE_API_BASE"] ?? "/api";
const LATENCY = 220;

function respond<T>(data: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));
}

export const api = {
  /** GET /stations */
  listStations: () => respond<Station[]>(STATIONS),
  /** GET /stations/:id */
  getStation: (id: string) => respond<Station | undefined>(STATIONS.find((s) => s.id === id)),
  /** GET /sensors */
  listSensors: () => respond<Sensor[]>(STATIONS.flatMap((s) => s.sensors)),
  /** GET /anomalies?severity=&verdict=&station= */
  listAnomalies: (filters?: { severity?: string; verdict?: string; stationId?: string; q?: string }) => {
    let rows = ANOMALIES;
    if (filters?.severity && filters.severity !== "all") rows = rows.filter((a) => a.severity === filters.severity);
    if (filters?.verdict && filters.verdict !== "all") rows = rows.filter((a) => a.verdict === filters.verdict);
    if (filters?.stationId && filters.stationId !== "all") rows = rows.filter((a) => a.stationId === filters.stationId);
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      rows = rows.filter((a) => `${a.id} ${a.stationName} ${a.type} ${a.sensorType}`.toLowerCase().includes(q));
    }
    return respond<Anomaly[]>(rows);
  },
  /** GET /anomalies/:id */
  getAnomaly: (id: string) => respond<Anomaly | undefined>(ANOMALIES.find((a) => a.id === id)),
  /** PATCH /anomalies/:id */
  updateAnomalyStatus: (id: string, status: Anomaly["status"]) => {
    const found = ANOMALIES.find((a) => a.id === id);
    if (found) found.status = status;
    return respond<Anomaly | undefined>(found, 120);
  },
  /** GET /analytics/overview */
  getAnalytics: () => respond(ANALYTICS),
  /** GET /demo/scenarios */
  listScenarios: () => respond(DEMO_SCENARIOS),
  /** GET /readings?sensor=&window= */
  getReadings: (type: SensorType, faulty = false): Promise<Reading[]> =>
    respond(buildSeries(21, type, faulty, !faulty)),
  meta: SENSOR_META,
};
