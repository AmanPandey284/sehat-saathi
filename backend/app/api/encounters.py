from __future__ import annotations

import json
import time
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.db import get_db, transaction

router = APIRouter(prefix="/encounters", tags=["encounters"])


class CreateEncounterRequest(BaseModel):
    patient_id: str | None = None
    patient_name: str = "Anonymous Patient"
    age: int | None = None
    gender: str | None = None
    abha_id: str | None = None
    abdm_consent: bool = False
    triage_level: str = "routine"  # routine, priority, emergency
    chief_complaint: str = ""
    history_present_illness: dict[str, Any] = Field(default_factory=dict)
    ayush_intake: dict[str, Any] = Field(default_factory=dict)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    vitals: list[dict[str, Any]] = Field(default_factory=list)
    lab_results: list[dict[str, Any]] = Field(default_factory=list)
    clinical_summary: str = ""


class SignoffEncounterRequest(BaseModel):
    decision: str = Field(description="'CONFIRMED_AND_SIGNED', 'CLARIFICATION_REQUESTED', or 'FLAGGED_HIGH_RISK'")
    review_note: str = ""
    expected_version: int | None = Field(default=None, description="Current encounter version for optimistic locking")


VALID_DECISIONS = {
    "CONFIRMED_AND_SIGNED",
    "CLARIFICATION_REQUESTED",
    "FLAGGED_HIGH_RISK",
}


@router.post("")
def create_encounter(
    req: CreateEncounterRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    # Security: bind patient identity to authenticated session token
    # Only physicians/admins can explicitly specify a different patient_id
    if user.get("role") in ("doctor", "admin") and req.patient_id:
        bound_patient_id = req.patient_id
    else:
        bound_patient_id = user["sub"]

    enc_id = f"enc-{uuid.uuid4().hex[:8]}"
    now = int(time.time())

    with transaction() as conn:
        conn.execute(
            """
            INSERT INTO encounters (
                id, patient_id, patient_name, age, gender, abha_id,
                abdm_consent, triage_level, chief_complaint,
                history_json, ayush_json, documents_json,
                vitals_json, labs_json, summary_text,
                version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                enc_id,
                bound_patient_id,
                req.patient_name,
                req.age,
                req.gender,
                req.abha_id,
                1 if req.abdm_consent else 0,
                req.triage_level,
                req.chief_complaint,
                json.dumps(req.history_present_illness),
                json.dumps(req.ayush_intake),
                json.dumps(req.documents),
                json.dumps(req.vitals),
                json.dumps(req.lab_results),
                req.clinical_summary,
                1,
                now,
                now,
            ),
        )

        conn.execute(
            """
            INSERT INTO encounter_audit (encounter_id, action, actor, actor_name, timestamp, note)
            VALUES (?, ?, ?, ?, ?, ?);
            """,
            (
                enc_id,
                "ENCOUNTER_CREATED",
                user["sub"],
                user.get("name", "Patient"),
                now,
                "Patient clinical intake submitted and queued for physician verification",
            ),
        )

    # Return full encounter record
    return {
        "ok": True,
        "encounter": _fetch_encounter(enc_id),
    }


def _fetch_encounter(enc_id: str) -> dict[str, Any]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM encounters WHERE id = ?;", (enc_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found.")

        d = dict(row)
        # Parse JSON fields
        d["history_present_illness"] = json.loads(d.pop("history_json") or "{}")
        d["ayush_intake"] = json.loads(d.pop("ayush_json") or "{}")
        d["documents"] = json.loads(d.pop("documents_json") or "[]")
        d["vitals"] = json.loads(d.pop("vitals_json") or "[]")
        d["lab_results"] = json.loads(d.pop("labs_json") or "[]")
        d["clinical_summary"] = d.pop("summary_text") or ""
        d["abdm_consent"] = bool(d["abdm_consent"])

        # Fetch audit trail
        audit_rows = conn.execute(
            "SELECT action, actor, actor_name, timestamp, note FROM encounter_audit WHERE encounter_id = ? ORDER BY timestamp ASC;",
            (enc_id,),
        ).fetchall()
        d["audit_trail"] = [dict(a) for a in audit_rows]
        return d


@router.get("")
def list_encounters(
    user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    role = user.get("role")
    sub = user.get("sub")

    with get_db() as conn:
        if role in ("doctor", "admin"):
            rows = conn.execute("SELECT id FROM encounters ORDER BY created_at DESC;").fetchall()
        else:
            rows = conn.execute(
                "SELECT id FROM encounters WHERE patient_id = ? OR abha_id = ? ORDER BY created_at DESC;",
                (sub, sub),
            ).fetchall()

    return [_fetch_encounter(r["id"]) for r in rows]


@router.get("/{encounter_id}")
def get_encounter(
    encounter_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    enc = _fetch_encounter(encounter_id)
    if user.get("role") not in ("doctor", "admin"):
        if enc["patient_id"] != user["sub"] and enc.get("abha_id") != user["sub"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this clinical record.")
    return enc


@router.post("/{encounter_id}/signoff")
def signoff_encounter(
    encounter_id: str,
    req: SignoffEncounterRequest,
    doctor: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if doctor.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only licensed physicians may sign off on clinical encounters.")

    if req.decision not in VALID_DECISIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision '{req.decision}'. Allowed decisions: {', '.join(sorted(VALID_DECISIONS))}",
        )

    now = int(time.time())

    with transaction() as conn:
        row = conn.execute("SELECT version FROM encounters WHERE id = ?;", (encounter_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found.")

        current_version = row["version"]

        # Optimistic Locking Check
        if req.expected_version is not None and current_version != req.expected_version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stale write detected. Encounter was updated by another reviewer (version {current_version} != expected {req.expected_version}). Please refresh and review.",
            )

        new_version = current_version + 1
        doctor_name = doctor.get("name") or doctor.get("sub")

        conn.execute(
            """
            UPDATE encounters SET
                version = ?,
                updated_at = ?,
                physician_decision = ?,
                physician_review_note = ?,
                physician_signed_by = ?,
                physician_signed_at = ?
            WHERE id = ?;
            """,
            (
                new_version,
                now,
                req.decision,
                req.review_note,
                doctor_name,
                now,
                encounter_id,
            ),
        )

        conn.execute(
            """
            INSERT INTO encounter_audit (encounter_id, action, actor, actor_name, timestamp, note)
            VALUES (?, ?, ?, ?, ?, ?);
            """,
            (
                encounter_id,
                f"DECISION_{req.decision}",
                doctor["sub"],
                doctor_name,
                now,
                req.review_note,
            ),
        )

    return {
        "ok": True,
        "encounter": _fetch_encounter(encounter_id),
    }
