from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import (
    authenticate_doctor,
    create_token,
    get_current_user,
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
# Patient OTP Endpoints
# ---------------------------------------------------------

class SendOtpRequest(BaseModel):
    recipient: str = Field(min_length=3, description="Mobile number (10 digits) or Email address")
    channel: str = Field(default="email", description="'email' or 'sms'")
    purpose: str = Field(default="intake", description="'intake' or 'login'")


class VerifyOtpRequest(BaseModel):
    challenge_id: str = Field(min_length=1)
    recipient: str = Field(min_length=3)
    code: str = Field(min_length=6, max_length=6)


@router.post("/otp/send")
async def send_otp(request: SendOtpRequest) -> dict[str, Any]:
    res = await send_otp_challenge(
        recipient=request.recipient,
        channel=request.channel,
        purpose=request.purpose,
    )
    if not res.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=res.get("error", "Rate limit exceeded. Please wait."),
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
    reviewer: str = Field(default="Clinical Administrator")


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
        role="doctor",
        extra={"doctor_status": doctor["status"], "name": doctor["name"]},
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {k: v for k, v in doctor.items() if k != "password"},
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
        "application": {k: v for k, v in new_doc.items() if k != "password"},
    }


@router.get("/doctor/applications")
def get_doctor_applications(user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    # In production, check user["role"] == "admin" or privileged doctor
    return list_doctor_applications()


@router.post("/doctor/verify")
def verify_doctor(
    request: DoctorVerifyActionRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    reviewer_name = user.get("name") or request.reviewer
    updated = verify_doctor_application(
        doctor_id=request.doctor_id,
        action=request.action,
        reason=request.reason,
        reviewer=reviewer_name,
    )
    return {
        "ok": True,
        "message": f"Physician application {request.action}ed.",
        "doctor": updated,
    }