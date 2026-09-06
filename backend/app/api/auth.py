from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import (
    authenticate_doctor,
    create_token,
    get_current_user,
    generate_patient_otp,
    verify_patient_otp,
)
class PatientSendOtpRequest(BaseModel):
    mobile: str = Field(min_length=10, max_length=10)


class PatientVerifyOtpRequest(BaseModel):
    mobile: str = Field(min_length=10, max_length=10)
    otp: str = Field(min_length=6, max_length=6)


router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)


class DoctorLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)
    registration_id: str = Field(min_length=1)


@router.post("/doctor/login")
def doctor_login(
    request: DoctorLoginRequest,
):
    doctor = authenticate_doctor(
        email=request.email,
        password=request.password,
        registration_id=request.registration_id,
    )

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid doctor credentials",
        )

    token = create_token(
        user_id=doctor["id"],
        role="doctor",
        doctor_status="approved",
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": doctor,
    }


@router.get("/me")
def me(
    current_user: dict = Depends(
        get_current_user
    ),
):
    return current_user
@router.post("/patient/send-otp")
def send_patient_otp(request: PatientSendOtpRequest):
    otp = generate_patient_otp(request.mobile)

    return {
        "message": "OTP generated successfully",
        "demo_otp": otp,
    }


@router.post("/patient/verify-otp")
def verify_patient_otp_endpoint(request: PatientVerifyOtpRequest):
    verified = verify_patient_otp(
        mobile=request.mobile,
        otp=request.otp,
    )

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    token = create_token(
        user_id=f"patient-{request.mobile}",
        role="patient",
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": f"patient-{request.mobile}",
            "mobile": request.mobile,
            "role": "patient",
        },
    }