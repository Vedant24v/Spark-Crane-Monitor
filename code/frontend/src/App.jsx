import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";

const API_BASE = "http://localhost:8000";
const CRANES = ["CR-101", "CR-102", "CR-103"];

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return `${Number(value).toFixed(1)}${suffix}`;
}

function formatTimestamp(ts) {
  if (!ts) {
    return "--";
  }
  return ts.slice(0, 16).replace("T", " ");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function ApiStatus({ refreshTrigger }) {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHealth() {
      try {
        const data = await fetchJson(`${API_BASE}/api/health`);
        if (mounted) {
          setHealth(data);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      }
    }

    loadHealth();
    const interval = setInterval(loadHealth, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [refreshTrigger]);

  return (
    <section className="statusBar" aria-label="API status">
      <div>
        <span className={`statusDot ${error ? "down" : "up"}`} />
        <span className="statusText">{error ? "API offline" : "API connected"}</span>
      </div>
      <dl className="statusMetrics">
        <div>
          <dt>Readings</dt>
          <dd>{health?.readings_count ?? "--"}</dd>
        </div>
        <div>
          <dt>Alerts</dt>
          <dd>{health?.alerts_count ?? "--"}</dd>
        </div>
        <div>
          <dt>Cranes</dt>
          <dd>{health?.cranes_count ?? "--"}</dd>
        </div>
        <div>
          <dt>Last Reading</dt>
          <dd>{formatTimestamp(health?.last_reading_ts)}</dd>
        </div>
      </dl>
    </section>
  );
}

function CraneOverview({ refreshTrigger }) {
  const [readings, setReadings] = useState([]);
  const [histories, setHistories] = useState({});
  const [filter, setFilter] = useState("ALL");
  const [lastFetched, setLastFetched] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchLatest() {
      try {
        const data = await fetchJson(`${API_BASE}/api/readings/latest`);
        if (mounted) {
          setReadings(data);
          setLastFetched(Date.now());
        }
      } catch (error) {
        console.error("Failed to fetch latest readings", error);
      }

      // Fetch histories for sparklines
      try {
        const historyPromises = CRANES.map(async (craneId) => {
          const historyData = await fetchJson(`${API_BASE}/api/readings/${craneId}`);
          return { craneId, data: historyData.slice(-10) };
        });
        const historyResults = await Promise.all(historyPromises);
        if (mounted) {
          const newHistories = {};
          historyResults.forEach(({ craneId, data }) => {
            newHistories[craneId] = data;
          });
          setHistories(newHistories);
        }
      } catch (error) {
        console.error("Failed to fetch histories", error);
      }
    }

    fetchLatest();
    const interval = setInterval(fetchLatest, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [refreshTrigger]);

  useEffect(() => {
    if (!lastFetched) return;
    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastFetched) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastFetched]);

  const filteredCranes = CRANES.filter((craneId) => {
    if (filter === "ALL") return true;
    const reading = readings.find((item) => item.crane_id === craneId);
    const status = reading?.status || "IDLE";
    return status === filter;
  });

  return (
    <section className="section">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Live fleet state</p>
          <h2>Crane Overview</h2>
        </div>
        <div className="overviewHeaderRight">
          <div className="filterGroup">
            <span className="filterLabel">Show:</span>
            <div className="segmentedControl">
              {["ALL", "RUNNING", "IDLE"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`filterTab ${filter === opt ? "active" : ""}`}
                  onClick={() => setFilter(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <span className="liveClock">
            Refreshes every 5s {lastFetched ? `• Updated ${secondsAgo}s ago` : ""}
          </span>
        </div>
      </div>
      <div className="overviewGrid">
        {filteredCranes.map((craneId) => {
          const reading = readings.find((item) => item.crane_id === craneId);
          const status = reading?.status || "IDLE";
          const isHot = (reading?.motor_temp_c ?? 0) > 80;
          const tempVal = reading?.motor_temp_c;
          const tempClass =
            tempVal === undefined || tempVal === null
              ? "temp-low"
              : tempVal < 70
              ? "temp-low"
              : tempVal <= 80
              ? "temp-med"
              : "temp-high";

          return (
            <article className={`craneCard ${tempClass}`} key={craneId}>
              <div className="cardTopline">
                <div>
                  <p className="cardLabel">Crane ID</p>
                  <h3>{craneId}</h3>
                </div>
                <span className={`statusPill ${status === "RUNNING" ? "running" : "idle"}`}>
                  {status}
                </span>
              </div>
              <dl className="readingGrid">
                <div>
                  <dt>Load</dt>
                  <dd>{formatValue(reading?.load_kg, " kg")}</dd>
                </div>
                <div>
                  <dt>Motor Temp</dt>
                  <dd className={isHot ? "hotText" : ""}>
                    {formatValue(reading?.motor_temp_c, "\u00b0C")}
                  </dd>
                </div>
                <div>
                  <dt>Vibration</dt>
                  <dd>{formatValue(reading?.vibration_mm_s, " mm/s")}</dd>
                </div>
                <div className="wide">
                  <dt>Timestamp</dt>
                  <dd>{formatTimestamp(reading?.ts)}</dd>
                </div>
              </dl>
              {histories[craneId] && histories[craneId].length > 0 ? (
                <div className="sparklineWrap">
                  <span className="sparklineLabel">Temp History (Last 10)</span>
                  <ResponsiveContainer width="100%" height={30}>
                    <LineChart data={histories[craneId]}>
                      <Line
                        type="monotone"
                        dataKey="motor_temp_c"
                        stroke={isHot ? "#d92d20" : "#005fcc"}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="sparklineWrap empty">
                  <span className="sparklineLabel">No History Data</span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TempChart({ refreshTrigger }) {
  const [selectedCrane, setSelectedCrane] = useState("CR-101");
  const [readings, setReadings] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function fetchReadings() {
      try {
        const data = await fetchJson(`${API_BASE}/api/readings/${selectedCrane}`);
        if (mounted) {
          setReadings(
            data.map((reading) => ({
              ...reading,
              time: reading.ts.slice(11, 16),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to fetch crane readings", error);
      }
    }

    fetchReadings();

    return () => {
      mounted = false;
    };
  }, [selectedCrane, refreshTrigger]);

  const stats = useMemo(() => {
    if (readings.length === 0) {
      return { peak: null, average: null, overThreshold: 0 };
    }

    const temps = readings.map((reading) => Number(reading.motor_temp_c));
    const total = temps.reduce((sum, value) => sum + value, 0);

    return {
      peak: Math.max(...temps),
      average: total / temps.length,
      overThreshold: temps.filter((value) => value > 80).length,
    };
  }, [readings]);

  return (
    <section className="section chartSection">
      <div className="sectionHeader chartHeader">
        <div>
          <p className="eyebrow">Temperature trend</p>
          <h2>Motor Temperature</h2>
        </div>
        <select
          value={selectedCrane}
          onChange={(event) => setSelectedCrane(event.target.value)}
          aria-label="Select crane"
        >
          {CRANES.map((craneId) => (
            <option key={craneId} value={craneId}>
              {craneId}
            </option>
          ))}
        </select>
      </div>
      <div className="chartStats" aria-label="Temperature summary">
        <div>
          <dt>Peak</dt>
          <dd>{formatValue(stats.peak, "\u00b0C")}</dd>
        </div>
        <div>
          <dt>Average</dt>
          <dd>{formatValue(stats.average, "\u00b0C")}</dd>
        </div>
        <div>
          <dt>Over Threshold</dt>
          <dd>{stats.overThreshold}</dd>
        </div>
      </div>
      <div className="chartShell">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={readings} margin={{ top: 20, right: 28, bottom: 12, left: 0 }}>
            <CartesianGrid stroke="#d7dee8" vertical={false} />
            <XAxis dataKey="time" stroke="#4b5563" tickLine={false} axisLine={false} />
            <YAxis stroke="#4b5563" tickLine={false} axisLine={false} domain={[40, 100]} />
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #d7dee8",
                borderRadius: "6px",
                color: "#111827",
              }}
              labelStyle={{ color: "#005fcc", fontWeight: 700 }}
            />
            <ReferenceLine
              y={80}
              stroke="#d92d20"
              strokeDasharray="6 6"
              label={{ value: "Threshold", fill: "#d92d20", position: "insideTopRight" }}
            />
            <Line
              type="monotone"
              dataKey="motor_temp_c"
              stroke="#005fcc"
              strokeWidth={3}
              dot={{ r: 4, fill: "#005fcc", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#111827", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function AlertsList({ refreshTrigger }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function fetchAlerts() {
      try {
        const data = await fetchJson(`${API_BASE}/api/alerts`);
        if (mounted) {
          setAlerts(data);
        }
      } catch (error) {
        console.error("Failed to fetch alerts", error);
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [refreshTrigger]);

  useEffect(() => {
    if (alerts.length > 0) {
      document.title = `(${alerts.length}) Crane Monitor`;
    } else {
      document.title = "Crane Monitor";
    }
  }, [alerts]);

  function exportToCsv() {
    if (alerts.length === 0) return;
    const headers = ["crane_id", "ts", "motor_temp_c", "created_at"];
    const rows = alerts.map((alert) => [
      alert.crane_id,
      alert.ts,
      alert.motor_temp_c,
      alert.created_at || "",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `crane_alerts_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <section className="section">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Exception log</p>
          <h2>Alerts</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span>{alerts.length} temperature events</span>
          {alerts.length > 0 && (
            <button type="button" className="btnSecondary" onClick={exportToCsv}>
              Export CSV
            </button>
          )}
        </div>
      </div>
      {alerts.length === 0 ? (
        <p className="emptyState">No alerts triggered yet</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Crane ID</th>
                <th>Timestamp</th>
                <th>Motor Temp (&deg;C)</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.crane_id}</td>
                  <td>{formatTimestamp(alert.ts)}</td>
                  <td className="hotText">{formatValue(alert.motor_temp_c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Simulator({ onIngestSuccess }) {
  const [craneId, setCraneId] = useState("CR-101");
  const [motorTemp, setMotorTemp] = useState("65.0");
  const [loadKg, setLoadKg] = useState("4500");
  const [vibration, setVibration] = useState("2.5");
  const [status, setStatus] = useState("RUNNING");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (banner) {
      const timer = setTimeout(() => {
        setBanner(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [banner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setBanner(null);

    if (!craneId) {
      setBanner({ type: "error", message: "Crane ID is required." });
      setIsSubmitting(false);
      return;
    }

    const tempNum = parseFloat(motorTemp);
    const loadNum = parseFloat(loadKg);
    const vibNum = parseFloat(vibration);

    if (isNaN(tempNum) || isNaN(loadNum) || isNaN(vibNum)) {
      setBanner({ type: "error", message: "Numeric fields must be valid numbers." });
      setIsSubmitting(false);
      return;
    }

    if (status !== "RUNNING" && status !== "IDLE") {
      setBanner({ type: "error", message: "Status must be RUNNING or IDLE." });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      crane_id: craneId,
      ts: new Date().toISOString(),
      load_kg: loadNum,
      motor_temp_c: tempNum,
      vibration_mm_s: vibNum,
      status: status,
    };

    try {
      const response = await fetch(`${API_BASE}/api/readings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      if (tempNum > 80) {
        setBanner({ type: "warning", message: "Critical Temperature Alert Triggered!" });
      } else {
        setBanner({ type: "success", message: "Telemetry ingested successfully." });
      }

      if (onIngestSuccess) {
        onIngestSuccess();
      }
    } catch (err) {
      console.error(err);
      setBanner({ type: "error", message: "Failed to ingest telemetry." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section simulatorSection">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Testing tool</p>
          <h2>IoT Device Simulator</h2>
        </div>
      </div>
      <div className="simulatorCard">
        {banner && <div className={`banner ${banner.type}`}>{banner.message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="formField">
            <label htmlFor="simCraneId">Crane ID</label>
            <select
              id="simCraneId"
              value={craneId}
              onChange={(e) => setCraneId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="CR-101">CR-101</option>
              <option value="CR-102">CR-102</option>
              <option value="CR-103">CR-103</option>
            </select>
          </div>

          <div className="formGrid">
            <div className="formField">
              <label htmlFor="simTemp">Motor Temp (&deg;C)</label>
              <input
                id="simTemp"
                type="number"
                step="0.1"
                value={motorTemp}
                onChange={(e) => setMotorTemp(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="formField">
              <label htmlFor="simLoad">Load (kg)</label>
              <input
                id="simLoad"
                type="number"
                value={loadKg}
                onChange={(e) => setLoadKg(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="formGrid">
            <div className="formField">
              <label htmlFor="simVib">Vibration (mm/s)</label>
              <input
                id="simVib"
                type="number"
                step="0.1"
                value={vibration}
                onChange={(e) => setVibration(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="formField">
              <label>Status</label>
              <div className="segmentedControl">
                <label className={`segmentLabel ${status === "RUNNING" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="simStatus"
                    value="RUNNING"
                    checked={status === "RUNNING"}
                    onChange={() => setStatus("RUNNING")}
                    disabled={isSubmitting}
                  />
                  RUNNING
                </label>
                <label className={`segmentLabel ${status === "IDLE" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="simStatus"
                    value="IDLE"
                    checked={status === "IDLE"}
                    onChange={() => setStatus("IDLE")}
                    disabled={isSubmitting}
                  />
                  IDLE
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="btnPrimary" disabled={isSubmitting}>
            {isSubmitting ? "Ingesting..." : "Send Telemetry"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <main className="app">
      <header className="appHeader">
        <div>
          <p className="eyebrow">IoT monitoring console</p>
          <h1>Crane Monitor</h1>
        </div>
        <span className="apiBadge">API {API_BASE}</span>
      </header>
      <ApiStatus refreshTrigger={refreshTrigger} />
      <CraneOverview refreshTrigger={refreshTrigger} />
      <div className="contentGrid">
        <TempChart refreshTrigger={refreshTrigger} />
        <div className="rightColumn">
          <Simulator onIngestSuccess={triggerRefresh} />
          <AlertsList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </main>
  );
}
