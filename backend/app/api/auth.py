from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import (
    authenticate_doctor,
    create_token,
    get_current_user,
    require_admin,
    get_doctor_by_id,
    send_otp_challenge,
    verify_otp_challenge,
    register_doctor_application,
    list_doctor_applications,
    verify_doctor_application,
)

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)


# ---------------------------------------------------------
# Session Check / User Identity (/api/auth/me)
# ---------------------------------------------------------

@router.get("/me")
def get_me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    user_id = user.get("sub", "")
    role = user.get("role", "patient")
    doc = get_doctor_by_id(user_id) if role in ("doctor", "admin") else None

    if doc:
        return {
            "id": doc["id"],
            "name": doc.get("name", "Physician"),
            "email": doc["email"],
            "role": doc.get("role", "doctor"),
            "doctor_status": doc.get("status", "approved"),
            "registration_id": doc.get("registration_id", ""),
            "medical_system": doc.get("medical_system", "Allopathy"),
            "specialty": doc.get("specialty", ""),
            "council_name": doc.get("council_name", ""),
        }

    return {
        "id": user_id,
        "name": user.get("name", "Patient"),
        "email": user_id if "@" in user_id else f"{user_id}@mobile.auth",
        "role": role,
        "doctor_status": None,
        "registration_id": "",
    }


# ---------------------------------------------------------
# Patient OTP Endpoints
# ---------------------------------------------------------

class SendOtpRequest(BaseModel):
    recipient: str = Field(min_length=3, description="Email address or mobile identifier")
    channel: str = Field(default="email", description="'email' or 'sms'")
    purpose: str = Field(default="intake", description="'intake' or 'login'")


class VerifyOtpRequest(BaseModel):
    challenge_id: str = Field(min_length=1)
    recipient: str = Field(min_length=3)
    code: str = Field(min_length=6, max_length=6)


class PatientLegacySendRequest(BaseModel):
    mobile: str = Field(min_length=10, max_length=10)


class PatientLegacyVerifyRequest(BaseModel):
    mobile: str = Field(min_length=10, max_length=10)
    otp: str = Field(min_length=6, max_length=6)


@router.post("/otp/send")
async def send_otp(request: SendOtpRequest) -> dict[str, Any]:
    res = await send_otp_challenge(
        recipient=request.recipient,
        channel=request.channel,
        purpose=request.purpose,
    )
    if not res.get("ok"):
        status_code = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if res.get("delivery_mode") == "rate_limited"
            else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        raise HTTPException(
            status_code=status_code,
            detail=res.get("error", "Failed to dispatch verification code."),
        )
    return res


@router.post("/otp/verify")
def verify_otp(request: VerifyOtpRequest) -> dict[str, Any]:
    res = verify_otp_challenge(
        challenge_id=request.challenge_id,
        recipient=request.recipient,
        code=request.code,
    )
    if not res.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("error", "OTP verification failed."),
        )
    return res


# Legacy client route aliases
@router.post("/patient/send-otp")
async def patient_legacy_send_otp(req: PatientLegacySendRequest) -> dict[str, Any]:
    res = await send_otp_challenge(recipient=req.mobile, channel="email", purpose="login")
    if not res.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS if res.get("delivery_mode") == "rate_limited" else status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=res.get("error", "Failed to send OTP"),
        )
    return {
        "status": "success",
        "message": res.get("message"),
        "challenge_id": res.get("challenge_id"),
        "demo_otp": res.get("dev_code"),
        "expires_in_seconds": res.get("expires_in_seconds"),
    }


@router.post("/patient/verify-otp")
def patient_legacy_verify_otp(req: PatientLegacyVerifyRequest) -> dict[str, Any]:
    # Search for active challenge by recipient
    from app.core.auth import OTP_CHALLENGES
    challenge_id = None
    for cid, r in OTP_CHALLENGES.items():
        if r["recipient"] == req.mobile.strip().lower():
            challenge_id = cid
            break

    if not challenge_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP challenge for this mobile number.",
        )

    res = verify_otp_challenge(challenge_id=challenge_id, recipient=req.mobile, code=req.otp)
    if not res.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("error", "OTP verification failed."),
        )
    return {
        "status": "success",
        "token": res.get("session_token"),
        "user": {
            "id": req.mobile,
            "role": "patient",
            "mobile": req.mobile,
        },
    }


# ---------------------------------------------------------
# Doctor Authentication & Application Endpoints
# ---------------------------------------------------------

class DoctorLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)
    registration_id: str | None = None


class DoctorRegisterRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str = Field(min_length=5)
    password: str = Field(min_length=6)
    medical_system: str = Field(default="Allopathy", description="Allopathy, Ayurveda, etc.")
    specialty: str = Field(min_length=2)
    registration_number: str = Field(min_length=2)
    council_name: str = Field(min_length=2)
    years_of_experience: int = Field(default=1, ge=0)
    hospital_name: str = Field(default="")


class DoctorVerifyActionRequest(BaseModel):
    doctor_id: str
    action: str = Field(description="'approve', 'reject', or 'needs_correction'")
    reason: str = Field(default="")


@router.post("/doctor/login")
def doctor_login(request: DoctorLoginRequest) -> dict[str, Any]:
    doctor = authenticate_doctor(
        email=request.email,
        password=request.password,
        registration_id=request.registration_id,
    )

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid physician credentials or registration details.",
        )

    if doctor.get("status") != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Physician account verification status: {doctor.get('status')}. EHR access requires clinical administrator approval.",
        )

    token = create_token(
        user_id=doctor["id"],
        role=doctor.get("role", "doctor"),
        extra={"doctor_status": doctor["status"], "name": doctor["name"]},
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {k: v for k, v in doctor.items() if k != "password_hash"},
    }


@router.post("/doctor/register")
def doctor_register(request: DoctorRegisterRequest) -> dict[str, Any]:
    new_doc = register_doctor_application(
        name=request.name,
        email=request.email,
        password=request.password,
        medical_system=request.medical_system,
        specialty=request.specialty,
        registration_number=request.registration_number,
        council_name=request.council_name,
        years_of_experience=request.years_of_experience,
        hospital_name=request.hospital_name,
    )
    return {
        "ok": True,
        "message": "Physician application submitted successfully. Application is pending administrator verification.",
        "application": new_doc,
    }


@router.get("/doctor/applications")
def get_doctor_applications(admin: dict[str, Any] = Depends(require_admin)) -> list[dict[str, Any]]:
    """Strictly gated behind Administrator authorization."""
    return list_doctor_applications()


@router.post("/doctor/verify")
def verify_doctor(
    request: DoctorVerifyActionRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """Strictly gated behind Administrator authorization with audit trail."""
    reviewer_id = admin.get("sub", "admin")
    updated = verify_doctor_application(
        doctor_id=request.doctor_id,
        action=request.action,
        reason=request.reason,
        reviewer_id=reviewer_id,
    )
    return {
        "ok": True,
        "message": f"Physician application {request.action}ed by {reviewer_id}.",
        "doctor": updated,
    }