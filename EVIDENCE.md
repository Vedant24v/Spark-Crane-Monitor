# Evidence

## POST /api/readings (Telemetry Ingestion & Live Alert Trigger)

```bash
curl -X POST "http://localhost:8000/api/readings" \
  -H "Content-Type: application/json" \
  -d '{
    "crane_id": "CR-102",
    "ts": "2026-06-19T13:00:00Z",
    "load_kg": 4700,
    "motor_temp_c": 85.5,
    "vibration_mm_s": 3.2,
    "status": "RUNNING"
  }'
```

### Response:
```json
{
  "inserted": 1,
  "alerts_created": 1
}
```

---

## GET /api/readings/latest

```bash
curl -X GET "http://localhost:8000/api/readings/latest"
```

### Response:
```json
[
  {
    "id": 16,
    "crane_id": "CR-101",
    "ts": "2026-06-19T12:00:00",
    "load_kg": 4500.0,
    "motor_temp_c": 65.0,
    "vibration_mm_s": 2.5,
    "status": "RUNNING"
  },
  {
    "id": 17,
    "crane_id": "CR-102",
    "ts": "2026-06-19T13:00:00",
    "load_kg": 4700.0,
    "motor_temp_c": 85.5,
    "vibration_mm_s": 3.2,
    "status": "RUNNING"
  },
  {
    "id": 15,
    "crane_id": "CR-103",
    "ts": "2026-06-08T01:00:00",
    "load_kg": 1010.0,
    "motor_temp_c": 74.5,
    "vibration_mm_s": 2.0,
    "status": "IDLE"
  }
]
```

---

## GET /api/readings/CR-101?start=2026-06-08T00:00:00&end=2026-06-08T01:00:00

```bash
curl -X GET "http://localhost:8000/api/readings/CR-101?start=2026-06-08T00:00:00&end=2026-06-08T01:00:00"
```

### Response:
```json
[
  {
    "id": 1,
    "crane_id": "CR-101",
    "ts": "2026-06-08T00:00:00",
    "load_kg": 1250.0,
    "motor_temp_c": 65.5,
    "vibration_mm_s": 2.1,
    "status": "RUNNING"
  },
  {
    "id": 2,
    "crane_id": "CR-101",
    "ts": "2026-06-08T00:15:00",
    "load_kg": 1410.0,
    "motor_temp_c": 72.8,
    "vibration_mm_s": 2.4,
    "status": "RUNNING"
  },
  {
    "id": 3,
    "crane_id": "CR-101",
    "ts": "2026-06-08T00:30:00",
    "load_kg": 1540.0,
    "motor_temp_c": 81.7,
    "vibration_mm_s": 2.8,
    "status": "RUNNING"
  },
  {
    "id": 4,
    "crane_id": "CR-101",
    "ts": "2026-06-08T00:45:00",
    "load_kg": 990.0,
    "motor_temp_c": 76.4,
    "vibration_mm_s": 1.9,
    "status": "IDLE"
  },
  {
    "id": 5,
    "crane_id": "CR-101",
    "ts": "2026-06-08T01:00:00",
    "load_kg": 1680.0,
    "motor_temp_c": 84.2,
    "vibration_mm_s": 3.0,
    "status": "RUNNING"
  }
]
```

---

## GET /api/alerts

```bash
curl -X GET "http://localhost:8000/api/alerts"
```

### Response:
```json
[
  {
    "id": 5,
    "crane_id": "CR-102",
    "ts": "2026-06-19T13:00:00",
    "motor_temp_c": 85.5,
    "created_at": "2026-06-19T12:23:30"
  },
  {
    "id": 2,
    "crane_id": "CR-101",
    "ts": "2026-06-08T01:00:00",
    "motor_temp_c": 84.2,
    "created_at": "2026-06-19T10:16:03"
  },
  {
    "id": 4,
    "crane_id": "CR-103",
    "ts": "2026-06-08T00:45:00",
    "motor_temp_c": 83.1,
    "created_at": "2026-06-19T10:16:03"
  },
  {
    "id": 1,
    "crane_id": "CR-101",
    "ts": "2026-06-08T00:30:00",
    "motor_temp_c": 81.7,
    "created_at": "2026-06-19T10:16:03"
  },
  {
    "id": 3,
    "crane_id": "CR-103",
    "ts": "2026-06-08T00:30:00",
    "motor_temp_c": 86.8,
    "created_at": "2026-06-19T10:16:03"
  }
]
```

---

## Alert Trigger Evidence

- Terminal log output on the Uvicorn FastAPI server:
  ```text
  ALERT: CR-102 motor temp 85.5°C exceeds threshold
  ```
