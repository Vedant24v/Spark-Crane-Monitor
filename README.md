# Crane IoT Monitoring Console

Full-stack industrial crane telemetry monitoring dashboard built with FastAPI, SQLite, SQLAlchemy, React, Vite, and Recharts.

---

## Technical Architecture & Design Decisions

- **SQLite Database**: Designed for zero-config local operation. All schema setups and migrations run dynamically on startup.
- **FastAPI Backend**: Uses SQLAlchemy synchronous ORM for optimal performance. Endpoints ingest crane data, manage live alert generation thresholds (critical threshold > 80.0°C), and fetch histories/aggregates.
- **Ingestion & Alerting Lifecycle**:
  - Telemetry is posted to `/api/readings`.
  - Unique constraint `UNIQUE(crane_id, ts)` prevents duplicate readings.
  - If a incoming reading's `motor_temp_c` exceeds `80.0`, an Alert is generated transactionally and logged immediately to the console.
- **Frontend Architecture**:
  - Built with React, Vite, and Recharts.
  - Styled entirely in raw/plain CSS (no Tailwind, no external UI frameworks).
  - Uses smart state-lifting and dependency arrays to coordinate instant updates across components whenever new data is ingested, without interrupting standard 5-second polling loops.

---

## Latest Features Added

1. **IoT Device Simulator**:
   - Integrated directly in the right-sidebar layout.
   - Provides select control for Crane IDs, step-validated numeric temperature, load, and vibration inputs, and custom styled status toggles.
   - Triggers clean success, critical alert (warning), and HTTP error banners that auto-dismiss after 5s.
2. **Multi-State Live Clock**:
   - Shows time elapsed since the last data fetch (e.g. `Refreshes every 5s • Updated 3s ago`), resetting instantly on simulator data submissions.
3. **Card-Top Color Temperature Bands**:
   - Crane overview cards reflect their condition dynamically using professional subtle border transitions:
     - **Blue**: Normal (< 70.0°C)
     - **Yellow**: Warning (70.0°C - 80.0°C)
     - **Red**: Critical (> 80.0°C)
4. **Interactive Sparklines**:
   - Standardized a 10-point mini Recharts history graph inside each crane card representing the last 10 motor temperature readings.
5. **Overview Filters**:
   - Filter overview cards client-side using the `Show: ALL | RUNNING | IDLE` segmented control buttons in the Crane Overview section header.
6. **CSV Exporting**:
   - Dynamic button on the Alerts tab header that builds and downloads CSV records of triggered alerts client-side.
7. **Document Badge Alerts**:
   - Automatically appends active exception counts to the browser window tab title, e.g. `(N) Crane Monitor`.

---

## Instructions to Run

### 1. Start Backend API
Make sure you have Python 3.11/3.12 active in your environment, then run:
```bash
cd code/backend
pip install -r ../../requirements.txt
uvicorn main:app --reload
```

### 2. Seed Database (Optional)
If database is empty, seed it:
```bash
cd code/backend
python seed.py
```

### 3. Start Frontend Dashboard
Launch the Vite React environment:
```bash
cd code/frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
