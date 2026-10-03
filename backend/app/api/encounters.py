from __future__ import annotations

import json
from pathlib import Path
import time
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.auth import get_current_user

router = APIRouter(prefix="/encounters", tags=["encounters"])

DATA_PATH = Path(settings.data_dir)
ENCOUNTERS_FILE = DATA_PATH / "encounters.json"


def _load_encounters() -> list[dict[str, Any]]:
    DATA_PATH.mkdir(parents=True, exist_ok=True)
    if ENCOUNTERS_FILE.exists():
        try:
            with open(ENCOUNTERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_encounters(encounters: list[dict[str, Any]]) -> None:
    DATA_PATH.mkdir(parents=True, exist_ok=True)
    with open(ENCOUNTERS_FILE, "w", encoding="utf-8") as f:
        json.dump(encounters, f, indent=2)


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


@router.post("")
def create_encounter(
    req: CreateEncounterRequest,
) -> dict[str, Any]:
    encounters = _load_encounters()
    enc_id = f"enc-{uuid.uuid4().hex[:8]}"
    now = int(time.time())

    new_enc = {
        "id": enc_id,
        "patient_id": req.patient_id or f"pat-{uuid.uuid4().hex[:6]}",
        "patient_name": req.patient_name,
        "age": req.age,
        "gender": req.gender,
        "abha_id": req.abha_id,
        "abdm_consent": req.abdm_consent,
        "triage_level": req.triage_level,
        "chief_complaint": req.chief_complaint,
        "history_present_illness": req.history_present_illness,
        "ayush_intake": req.ayush_intake,
        "documents": req.documents,
        "vitals": req.vitals,
        "lab_results": req.lab_results,
        "clinical_summary": req.clinical_summary,
        "version": 1,
        "created_at": now,
        "updated_at": now,
        "physician_decision": None,
        "physician_review_note": None,
        "physician_signed_by": None,
        "physician_signed_at": None,
        "audit_trail": [
            {
                "action": "ENCOUNTER_CREATED",
                "actor": "patient_session",
                "timestamp": now,
                "note": "Patient submitted clinical intake",
            }
        ],
    }

    encounters.append(new_enc)
    _save_encounters(encounters)
    return {"ok": True, "encounter": new_enc}


@router.get("")
def list_encounters(
    user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    encounters = _load_encounters()
    role = user.get("role")
    sub = user.get("sub")

    # If physician/admin, return all clinical encounters
    if role in ("doctor", "admin"):
        return encounters

    # If patient, return only their owned encounters
    return [e for e in encounters if e.get("patient_id") == sub or e.get("abha_id") == sub]


@router.get("/{encounter_id}")
def get_encounter(
    encounter_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    encounters = _load_encounters()
    for enc in encounters:
        if enc["id"] == encounter_id:
            # Authorization check
            if user.get("role") not in ("doctor", "admin"):
                if enc.get("patient_id") != user.get("sub") and enc.get("abha_id") != user.get("sub"):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this clinical record.")
            return enc

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found.")


@router.post("/{encounter_id}/signoff")
def signoff_encounter(
    encounter_id: str,
    req: SignoffEncounterRequest,
    doctor: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if doctor.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only licensed physicians may sign off on clinical encounters.")

    encounters = _load_encounters()
    for enc in encounters:
        if enc["id"] == encounter_id:
            now = int(time.time())
            enc["version"] = enc.get("version", 1) + 1
            enc["updated_at"] = now
            enc["physician_decision"] = req.decision
            enc["physician_review_note"] = req.review_note
            enc["physician_signed_by"] = doctor.get("name") or doctor.get("sub")
            enc["physician_signed_at"] = now
            enc.setdefault("audit_trail", []).append({
                "action": f"DECISION_{req.decision}",
                "actor": doctor.get("sub"),
                "actor_name": doctor.get("name"),
                "timestamp": now,
                "note": req.review_note,
            })
            _save_encounters(encounters)
            return {"ok": True, "encounter": enc}

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found.")
