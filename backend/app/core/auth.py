from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
import random

security = HTTPBearer()
# Temporary in-memory OTP storage for development/demo mode.
# This will later be replaced with a database/OTP provider.
PATIENT_OTPS: dict[str, dict] = {}
def generate_patient_otp(mobile: str) -> str:
    otp = f"{random.randint(0, 999999):06d}"

    PATIENT_OTPS[mobile] = {
        "otp": otp,
        "attempts": 0,
    }

    return otp
def verify_patient_otp(mobile: str, otp: str) -> bool:
    record = PATIENT_OTPS.get(mobile)

    if not record:
        return False

    if record["attempts"] >= 5:
        return False

    record["attempts"] += 1

    if record["otp"] != otp:
        return False

    del PATIENT_OTPS[mobile]

    return True

# Temporary doctor store.
# We will replace this with the database + admin approval system later.
DOCTORS = [
    {
        "id": "doctor-001",
        "email": "doctor1@sehat-saathi.com",
        "password": "Doctor@123",
        "registration_id": "REG001",
        "name": "Doctor One",
        "status": "approved",
    },
    {
        "id": "doctor-002",
        "email": "doctor2@sehat-saathi.com",
        "password": "Doctor@123",
        "registration_id": "REG002",
        "name": "Doctor Two",
        "status": "approved",
    },
    {
        "id": "doctor-003",
        "email": "doctor3@sehat-saathi.com",
        "password": "Doctor@123",
        "registration_id": "REG003",
        "name": "Doctor Three",
        "status": "approved",
    },
    {
        "id": "doctor-004",
        "email": "doctor4@sehat-saathi.com",
        "password": "Doctor@123",
        "registration_id": "REG004",
        "name": "Doctor Four",
        "status": "approved",
    },
    {
        "id": "doctor-005",
        "email": "doctor5@sehat-saathi.com",
        "password": "Doctor@123",
        "registration_id": "REG005",
        "name": "Doctor Five",
        "status": "approved",
    },
]


def authenticate_doctor(
    email: str,
    password: str,
    registration_id: str,
) -> dict[str, Any] | None:

    for doctor in DOCTORS:
        if (
            doctor["email"].lower() == email.lower()
            and doctor["password"] == password
            and doctor["registration_id"] == registration_id
        ):
            if doctor["status"] != "approved":
                return None

            return {
                "id": doctor["id"],
                "email": doctor["email"],
                "registration_id": doctor["registration_id"],
                "name": doctor["name"],
                "status": doctor["status"],
            }

    return None


def create_token(
    user_id: str,
    role: str,
    doctor_status: str | None = None,
) -> str:

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
    }

    if doctor_status:
        payload["doctor_status"] = doctor_status

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        user_id = payload.get("sub")
        role = payload.get("role")

        if not user_id or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        return {
            "user_id": user_id,
            "role": role,
            "doctor_status": payload.get("doctor_status"),
        }

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )