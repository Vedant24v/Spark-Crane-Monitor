from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy import (
    DateTime,
    Float,
    Integer,
    String,
    UniqueConstraint,
    create_engine,
    func,
    insert,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


DATABASE_URL = "sqlite:///./crane.db"
TEMP_THRESHOLD_C = 80.0

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Reading(Base):
    __tablename__ = "readings"
    __table_args__ = (UniqueConstraint("crane_id", "ts", name="uq_readings_crane_ts"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    crane_id: Mapped[str] = mapped_column(String, nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    load_kg: Mapped[float | None] = mapped_column(Float)
    motor_temp_c: Mapped[float | None] = mapped_column(Float)
    vibration_mm_s: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str | None] = mapped_column(String)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    crane_id: Mapped[str] = mapped_column(String, nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    motor_temp_c: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ReadingIn(BaseModel):
    crane_id: str
    ts: datetime
    load_kg: float | None = None
    motor_temp_c: float
    vibration_mm_s: float | None = None
    status: str | None = None

    @field_validator("crane_id")
    @classmethod
    def crane_id_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("crane_id must be non-empty")
        return value.strip()


app = FastAPI(title="Crane IoT Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def reading_to_dict(reading: Reading) -> dict[str, Any]:
    return {
        "id": reading.id,
        "crane_id": reading.crane_id,
        "ts": reading.ts.isoformat(),
        "load_kg": reading.load_kg,
        "motor_temp_c": reading.motor_temp_c,
        "vibration_mm_s": reading.vibration_mm_s,
        "status": reading.status,
    }


def alert_to_dict(alert: Alert) -> dict[str, Any]:
    return {
        "id": alert.id,
        "crane_id": alert.crane_id,
        "ts": alert.ts.isoformat(),
        "motor_temp_c": alert.motor_temp_c,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
    }


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "message": "Crane IoT Monitoring API",
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": [
            "POST /api/readings",
            "GET /api/readings/latest",
            "GET /api/readings/{crane_id}",
            "GET /api/alerts",
        ],
    }


@app.get("/api/health")
def health_check() -> dict[str, Any]:
    with SessionLocal() as db:
        readings_count = db.scalar(select(func.count()).select_from(Reading)) or 0
        alerts_count = db.scalar(select(func.count()).select_from(Alert)) or 0
        cranes_count = (
            db.scalar(select(func.count(func.distinct(Reading.crane_id)))) or 0
        )
        last_reading_ts = db.scalar(select(func.max(Reading.ts)))

    return {
        "ok": True,
        "readings_count": readings_count,
        "alerts_count": alerts_count,
        "cranes_count": cranes_count,
        "threshold_c": TEMP_THRESHOLD_C,
        "last_reading_ts": last_reading_ts.isoformat() if last_reading_ts else None,
    }


@app.post("/api/readings")
def create_readings(payload: ReadingIn | list[ReadingIn]) -> dict[str, int]:
    readings = payload if isinstance(payload, list) else [payload]
    inserted = 0
    alerts_created = 0

    with SessionLocal.begin() as db:
        for reading in readings:
            values = reading.model_dump()
            result = db.execute(insert(Reading).prefix_with("OR IGNORE").values(**values))

            if result.rowcount != 1:
                continue

            inserted += 1
            if reading.motor_temp_c > TEMP_THRESHOLD_C:
                db.add(
                    Alert(
                        crane_id=reading.crane_id,
                        ts=reading.ts,
                        motor_temp_c=reading.motor_temp_c,
                    )
                )
                alerts_created += 1
                print(
                    f"ALERT: {reading.crane_id} motor temp {reading.motor_temp_c}\u00b0C exceeds threshold"
                )

    return {"inserted": inserted, "alerts_created": alerts_created}


@app.get("/api/readings/latest")
def latest_readings() -> list[dict[str, Any]]:
    with SessionLocal() as db:
        latest_ts = (
            select(Reading.crane_id, func.max(Reading.ts).label("max_ts"))
            .group_by(Reading.crane_id)
            .subquery()
        )
        readings = db.scalars(
            select(Reading)
            .join(
                latest_ts,
                (Reading.crane_id == latest_ts.c.crane_id)
                & (Reading.ts == latest_ts.c.max_ts),
            )
            .order_by(Reading.crane_id)
        ).all()
        return [reading_to_dict(reading) for reading in readings]


@app.get("/api/readings/{crane_id}")
def readings_for_crane(
    crane_id: str,
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
) -> list[dict[str, Any]]:
    if not crane_id.strip():
        raise HTTPException(status_code=400, detail="crane_id must be non-empty")

    query = select(Reading).where(Reading.crane_id == crane_id.strip())
    if start is not None:
        query = query.where(Reading.ts >= start)
    if end is not None:
        query = query.where(Reading.ts <= end)

    with SessionLocal() as db:
        readings = db.scalars(query.order_by(Reading.ts.asc())).all()
        return [reading_to_dict(reading) for reading in readings]


@app.get("/api/alerts")
def get_alerts() -> list[dict[str, Any]]:
    with SessionLocal() as db:
        alerts = db.scalars(select(Alert).order_by(Alert.ts.desc())).all()
        return [alert_to_dict(alert) for alert in alerts]
