# Evidence

## 1. POST /api/readings (IoT Device Simulator POST Ingestion & Alert Trigger)

```bash
curl -X POST "http://localhost:8000/api/readings" \
  -H "Content-Type: application/json" \
  -d '{
    "crane_id": "CR-101",
    "ts": "2026-06-19T12:28:11.165000",
    "load_kg": 4500.0,
    "motor_temp_c": 100.0,
    "vibration_mm_s": 2.5,
    "status": "RUNNING"
  }'
```

### API Response:
```json
{
  "inserted": 1,
  "alerts_created": 1
}
```

### Live Backend Terminal Alert Log:
```text
ALERT: CR-101 motor temp 100.0°C exceeds threshold
```

---

## 2. GET /api/readings/latest

```bash
curl http://localhost:8000/api/readings/latest
```

### Response:
```json
[
  {
    "id": 22,
    "crane_id": "CR-101",
    "ts": "2026-06-19T12:37:37.838000",
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
    "id": 19,
    "crane_id": "CR-103",
    "ts": "2026-06-19T12:27:57.995000",
    "load_kg": 4500.0,
    "motor_temp_c": 65.0,
    "vibration_mm_s": 2.5,
    "status": "RUNNING"
  }
]
```

---

## 3. GET /api/readings/CR-101?start=2026-06-08T00:00:00&end=2026-06-08T01:00:00

```bash
curl "http://localhost:8000/api/readings/CR-101?start=2026-06-08T00:00:00&end=2026-06-08T01:00:00"
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

## 4. GET /api/alerts

```bash
curl http://localhost:8000/api/alerts
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
    "id": 6,
    "crane_id": "CR-101",
    "ts": "2026-06-19T12:28:11.165000",
    "motor_temp_c": 100.0,
    "created_at": "2026-06-19T12:28:11"
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

## 5. Live DB Seed Alert Logs
Console logs when seeding the initial database (simulating live ingestion events that exceed the threshold):
```text
ALERT: CR-101 motor temp 81.7°C exceeds threshold
ALERT: CR-101 motor temp 84.2°C exceeds threshold
ALERT: CR-103 motor temp 86.8°C exceeds threshold
ALERT: CR-103 motor temp 83.1°C exceeds threshold
```
