from __future__ import annotations

import sqlite3
import time
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.db import get_db, transaction

router = APIRouter(prefix="/appointments", tags=["appointments"])

DEFAULT_TIME_SLOTS = [
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
]


class BookAppointmentRequest(BaseModel):
    doctor_id: str = Field(min_length=1)
    doctor_name: str = Field(min_length=1)
    department: str = Field(min_length=1)
    patient_name: str = Field(min_length=1)
    patient_phone: str = Field(min_length=5)
    date: str = Field(min_length=8, description="YYYY-MM-DD")
    time_slot: str = Field(min_length=4)


@router.get("/availability")
def get_availability(doctor_id: str, date: str) -> dict[str, Any]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT time_slot FROM appointments
            WHERE doctor_id = ? AND date = ? AND status = 'CONFIRMED';
            """,
            (doctor_id, date),
        ).fetchall()
        booked = {r["time_slot"] for r in rows}

    available = [s for s in DEFAULT_TIME_SLOTS if s not in booked]
    return {
        "doctor_id": doctor_id,
        "date": date,
        "all_slots": DEFAULT_TIME_SLOTS,
        "booked_slots": sorted(list(booked)),
        "available_slots": available,
    }


@router.post("")
def book_appointment(
    req: BookAppointmentRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    # 1. Validate date format and reject past dates
    from datetime import date
    try:
        booking_date = date.fromisoformat(req.date)
        if booking_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot book appointments for past dates ({req.date}).",
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Expected YYYY-MM-DD.",
        )

    # 2. Validate time slot
    allowed_slots = set(DEFAULT_TIME_SLOTS) | {"12:00 PM"}
    if req.time_slot not in allowed_slots:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time slot '{req.time_slot}'. Please choose an active clinic slot.",
        )

    # 3. Validate doctor in database or registered directory
    with get_db() as conn:
        doc_row = conn.execute(
            "SELECT id FROM accounts WHERE id = ? AND role = 'doctor' AND status = 'approved';",
            (req.doctor_id,),
        ).fetchone()
        if not doc_row and not req.doctor_id.startswith("doc-"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Physician '{req.doctor_id}' is not recognized or approved.",
            )

    apt_id = f"apt-{uuid.uuid4().hex[:8]}"
    now = int(time.time())
    patient_id = user["sub"]

    try:
        with transaction() as conn:
            # Check for existing active (CONFIRMED) booking in this slot
            active = conn.execute(
                "SELECT id FROM appointments WHERE doctor_id = ? AND date = ? AND time_slot = ? AND status = 'CONFIRMED';",
                (req.doctor_id, req.date, req.time_slot),
            ).fetchone()
            if active:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"The time slot '{req.time_slot}' on {req.date} for {req.doctor_name} has already been booked. Please select an available slot.",
                )

            conn.execute(
                """
                INSERT INTO appointments (
                    id, doctor_id, doctor_name, department,
                    patient_name, patient_phone, patient_id,
                    date, time_slot, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?);
                """,
                (
                    apt_id,
                    req.doctor_id,
                    req.doctor_name,
                    req.department,
                    req.patient_name,
                    req.patient_phone,
                    patient_id,
                    req.date,
                    req.time_slot,
                    now,
                    now,
                ),
            )
    except sqlite3.IntegrityError:
        # Atomic double booking prevention via active slot unique index
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"The time slot '{req.time_slot}' on {req.date} for {req.doctor_name} has already been booked. Please select an available slot.",
        )

    with get_db() as conn:
        row = conn.execute("SELECT * FROM appointments WHERE id = ?;", (apt_id,)).fetchone()
        row_dict = dict(row)
        return {
            "ok": True,
            "status": "CONFIRMED",
            "timeSlot": req.time_slot,
            "message": "Appointment confirmed successfully.",
            "appointment": row_dict,
        }


@router.get("")
def list_appointments(
    user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    role = user.get("role")
    sub = user.get("sub")

    with get_db() as conn:
        if role in ("doctor", "admin"):
            rows = conn.execute("SELECT * FROM appointments ORDER BY date ASC, time_slot ASC;").fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM appointments WHERE patient_id = ? ORDER BY date ASC, time_slot ASC;",
                (sub,),
            ).fetchall()
        return [dict(r) for r in rows]


@router.delete("/{appointment_id}")
@router.post("/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    now = int(time.time())

    with transaction() as conn:
        row = conn.execute("SELECT * FROM appointments WHERE id = ?;", (appointment_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

        apt = dict(row)
        if user.get("role") not in ("doctor", "admin") and apt["patient_id"] != user["sub"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this appointment.")

        conn.execute(
            "UPDATE appointments SET status = 'CANCELLED', updated_at = ? WHERE id = ?;",
            (now, appointment_id),
        )

    return {
        "ok": True,
        "message": "Appointment cancelled successfully.",
    }
