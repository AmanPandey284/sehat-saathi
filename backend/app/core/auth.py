from __future__ import annotations

import base64
import hashlib
import hmac
import json
from pathlib import Path
import secrets
import time
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx

from app.core.config import settings

security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------
# HMAC Token Engine (Dependency-free JWT alternative)
# ---------------------------------------------------------

def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)


def create_token(
    user_id: str,
    role: str,
    extra: dict[str, Any] | None = None,
) -> str:
    now = int(time.time())
    expires_at = now + (settings.access_token_expire_minutes * 60)
    payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": expires_at,
        **(extra or {}),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    b64_payload = _b64_encode(payload_bytes)

    sig = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        b64_payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    b64_sig = _b64_encode(sig)

    return f"{b64_payload}.{b64_sig}"


def verify_token(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token",
        )
    b64_payload, b64_sig = parts
    expected_sig = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        b64_payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    actual_sig = _b64_decode(b64_sig)

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
        )

    try:
        payload = json.loads(_b64_decode(b64_payload).decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
        )

    return payload


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization credentials required",
        )
    user = verify_token(credentials.credentials)

    # Server-side active validation for registered doctor accounts
    if user.get("role") == "doctor":
        doc = get_doctor_by_id(user.get("sub", ""))
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer exists",
            )
        if doc.get("status") != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Physician account status is not approved",
            )

    return user


def require_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required for this operation",
        )
    return current_user


# ---------------------------------------------------------
# Password Hashing Engine (PBKDF2-SHA256 with 200,000 rounds)
# ---------------------------------------------------------

def hash_password(password: str, salt: str | None = None) -> str:
    if not salt:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return f"{salt}${dk.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    if not stored_hash or "$" not in stored_hash:
        return False
    salt, expected = stored_hash.split("$", 1)
    dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return hmac.compare_digest(dk.hex(), expected)


# ---------------------------------------------------------
# Durable Accounts & Application Store
# ---------------------------------------------------------

DATA_PATH = Path(settings.data_dir)
ACCOUNTS_FILE = DATA_PATH / "doctor_accounts.json"

DEFAULT_SEED_ACCOUNTS = [
    {
        "id": "admin-001",
        "email": "admin@sehat-saathi.com",
        "password_hash": hash_password("Admin@Sehat2026!"),
        "name": "System Administrator",
        "role": "admin",
        "status": "approved",
        "created_at": 1727900000,
    },
    {
        "id": "demo-doctor",
        "email": "demo-doctor@sehat-saathi.com",
        "password_hash": hash_password("demo123"),
        "registration_id": "DEMO-REG-001",
        "name": "Dr. Sharma (MD, Clinical Lead)",
        "role": "doctor",
        "medical_system": "Allopathy",
        "specialty": "Emergency & Internal Medicine",
        "council_name": "Medical Council of India",
        "status": "approved",
        "created_at": 1727900000,
    },
    {
        "id": "doctor-001",
        "email": "doctor1@sehat-saathi.com",
        "password_hash": hash_password("Doctor@123"),
        "registration_id": "REG001",
        "name": "Dr. Ramesh Sharma",
        "role": "doctor",
        "medical_system": "Allopathy",
        "specialty": "General Medicine",
        "council_name": "Delhi Medical Council",
        "status": "approved",
        "created_at": 1727900000,
    },
    {
        "id": "doctor-002",
        "email": "doctor2@sehat-saathi.com",
        "password_hash": hash_password("Doctor@123"),
        "registration_id": "REG002",
        "name": "Dr. Priya Patel",
        "role": "doctor",
        "medical_system": "Ayurveda",
        "specialty": "Kayachikitsa (Internal Medicine)",
        "council_name": "Central Council of Indian Medicine",
        "status": "approved",
        "created_at": 1727900000,
    },
]

_ACCOUNTS_CACHE: list[dict[str, Any]] | None = None


def _load_accounts() -> list[dict[str, Any]]:
    global _ACCOUNTS_CACHE
    if _ACCOUNTS_CACHE is not None:
        return _ACCOUNTS_CACHE

    DATA_PATH.mkdir(parents=True, exist_ok=True)
    if ACCOUNTS_FILE.exists():
        try:
            with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
                _ACCOUNTS_CACHE = json.load(f)
                return _ACCOUNTS_CACHE
        except Exception:
            pass

    _ACCOUNTS_CACHE = list(DEFAULT_SEED_ACCOUNTS)
    _save_accounts(_ACCOUNTS_CACHE)
    return _ACCOUNTS_CACHE


def _save_accounts(accounts: list[dict[str, Any]]) -> None:
    DATA_PATH.mkdir(parents=True, exist_ok=True)
    with open(ACCOUNTS_FILE, "w", encoding="utf-8") as f:
        json.dump(accounts, f, indent=2)


def get_doctor_by_id(user_id: str) -> dict[str, Any] | None:
    accounts = _load_accounts()
    for acc in accounts:
        if acc["id"] == user_id:
            return acc
    return None


def get_account_by_email(email: str) -> dict[str, Any] | None:
    clean_email = email.strip().lower()
    accounts = _load_accounts()
    for acc in accounts:
        if acc["email"].lower() == clean_email:
            return acc
    return None


def authenticate_doctor(
    email: str,
    password: str,
    registration_id: str | None = None,
) -> dict[str, Any] | None:
    clean_email = email.strip().lower()
    accounts = _load_accounts()
    for doc in accounts:
        if (
            doc["email"].lower() == clean_email
            or doc["id"].lower() == clean_email
        ):
            if not verify_password(password, doc.get("password_hash", "")):
                continue
            if registration_id and doc.get("registration_id") != registration_id:
                continue
            return doc
    return None


def register_doctor_application(
    name: str,
    email: str,
    password: str,
    medical_system: str,
    specialty: str,
    registration_number: str,
    council_name: str,
    years_of_experience: int = 1,
    hospital_name: str = "",
) -> dict[str, Any]:
    clean_email = email.strip().lower()
    accounts = _load_accounts()
    for doc in accounts:
        if doc["email"].lower() == clean_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A physician account with this email address already exists.",
            )

    doc_id = f"doc-{secrets.token_hex(4)}"
    new_doc = {
        "id": doc_id,
        "name": name.strip(),
        "email": clean_email,
        "password_hash": hash_password(password),
        "role": "doctor",
        "medical_system": medical_system.strip(),
        "specialty": specialty.strip(),
        "registration_id": registration_number.strip(),
        "council_name": council_name.strip(),
        "years_of_experience": years_of_experience,
        "hospital_name": hospital_name.strip(),
        "status": "PENDING_REVIEW",
        "applied_at": int(time.time()),
    }
    accounts.append(new_doc)
    _save_accounts(accounts)
    return {k: v for k, v in new_doc.items() if k != "password_hash"}


def list_doctor_applications() -> list[dict[str, Any]]:
    accounts = _load_accounts()
    return [
        {k: v for k, v in doc.items() if k != "password_hash"}
        for doc in accounts
        if doc.get("role") == "doctor"
    ]


def verify_doctor_application(
    doctor_id: str,
    action: str,  # approve, reject, needs_correction
    reason: str = "",
    reviewer_id: str = "admin",
) -> dict[str, Any]:
    accounts = _load_accounts()
    for doc in accounts:
        if doc["id"] == doctor_id:
            new_status = (
                "approved" if action == "approve"
                else "rejected" if action == "reject"
                else "needs_correction"
            )
            doc["status"] = new_status
            doc["reviewed_by"] = reviewer_id
            doc["reviewed_at"] = int(time.time())
            doc["review_reason"] = reason
            _save_accounts(accounts)
            return {k: v for k, v in doc.items() if k != "password_hash"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Physician application {doctor_id} not found.",
    )


# ---------------------------------------------------------
# Cryptographically Secure OTP Engine
# ---------------------------------------------------------

OTP_CHALLENGES: dict[str, dict[str, Any]] = {}
RECIPIENT_RATE_LIMITS: dict[str, list[float]] = {}


def _hash_otp(code: str, salt: str) -> str:
    key = (settings.effective_otp_secret + salt).encode("utf-8")
    return hmac.new(key, code.encode("utf-8"), hashlib.sha256).hexdigest()


async def send_otp_challenge(
    recipient: str,
    channel: str = "email",
    purpose: str = "login",
) -> dict[str, Any]:
    clean_recipient = recipient.strip().lower()
    now = int(time.time())

    # Rate limiting: max 5 requests per recipient per 10 minutes
    timestamps = RECIPIENT_RATE_LIMITS.setdefault(clean_recipient, [])
    timestamps = [t for t in timestamps if now - t < 600]
    RECIPIENT_RATE_LIMITS[clean_recipient] = timestamps
    if len(timestamps) >= 5:
        return {
            "ok": False,
            "error": "Rate limit exceeded. Please wait 10 minutes before requesting a new code.",
            "delivery_mode": "rate_limited",
        }

    # Check active challenge for rate limit / cooldown
    prior_cooldown = 0
    for cid, rec in list(OTP_CHALLENGES.items()):
        if rec["recipient"] == clean_recipient:
            if rec["expires_at"] < now:
                del OTP_CHALLENGES[cid]
            elif rec["cooldown_until"] > now:
                remaining = rec["cooldown_until"] - now
                return {
                    "ok": False,
                    "challenge_id": cid,
                    "error": f"Please wait {remaining} seconds before requesting a new code.",
                    "cooldown_remaining": remaining,
                    "delivery_mode": "rate_limited",
                }
            else:
                # Invalidate existing challenge on resend, but maintain record of abuse
                prior_cooldown = rec.get("attempts", 0)
                del OTP_CHALLENGES[cid]

    # Verification channel validation
    if channel != "email":
        return {
            "ok": False,
            "error": "SMS gateway is currently unavailable. Please use Email verification.",
            "delivery_mode": "unavailable",
        }

    # Fail closed in production if no email credentials configured
    if not settings.is_simulation_permitted and not settings.resend_api_key:
        return {
            "ok": False,
            "error": "Email delivery service is unconfigured for production.",
            "delivery_mode": "unavailable",
        }

    challenge_id = secrets.token_hex(16)
    code = f"{secrets.randbelow(900000) + 100000:06d}"
    salt = secrets.token_hex(8)
    code_hash = _hash_otp(code, salt)

    OTP_CHALLENGES[challenge_id] = {
        "recipient": clean_recipient,
        "code_hash": code_hash,
        "salt": salt,
        "created_at": now,
        "expires_at": now + settings.otp_expire_seconds,
        "cooldown_until": now + settings.otp_cooldown_seconds,
        "attempts": prior_cooldown,  # Carry over attempt count on resend
        "purpose": purpose,
        "channel": channel,
    }
    timestamps.append(now)

    delivery_mode = "simulated"
    sent_successfully = False

    # Real delivery adapter using Resend if credentials are configured
    if settings.resend_api_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": settings.resend_from_email,
                        "to": clean_recipient,
                        "subject": "Sehat Saathi Verification Code",
                        "html": (
                            f"<div style='font-family: sans-serif; padding: 20px;'>"
                            f"<h2>Sehat Saathi Verification</h2>"
                            f"<p>Your one-time verification code is:</p>"
                            f"<div style='font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0f766e;'>{code}</div>"
                            f"<p style='color: #666; font-size: 13px;'>This code will expire in 5 minutes. Do not share it with anyone.</p>"
                            f"</div>"
                        ),
                    },
                )
                if res.status_code in (200, 201):
                    delivery_mode = "resend_api"
                    sent_successfully = True
                else:
                    if not settings.is_simulation_permitted:
                        # Fail closed in production
                        del OTP_CHALLENGES[challenge_id]
                        return {
                            "ok": False,
                            "error": "Failed to dispatch verification email via provider.",
                            "delivery_mode": "delivery_failed",
                        }
                    delivery_mode = "resend_failed_simulated"
                    sent_successfully = True
        except Exception:
            if not settings.is_simulation_permitted:
                del OTP_CHALLENGES[challenge_id]
                return {
                    "ok": False,
                    "error": "Delivery provider connection error.",
                    "delivery_mode": "delivery_failed",
                }
            delivery_mode = "resend_error_simulated"
            sent_successfully = True
    elif settings.is_simulation_permitted:
        delivery_mode = "simulated"
        sent_successfully = True
    else:
        # Production without Resend
        del OTP_CHALLENGES[challenge_id]
        return {
            "ok": False,
            "error": "Delivery service unconfigured.",
            "delivery_mode": "unavailable",
        }

    response = {
        "ok": sent_successfully,
        "challenge_id": challenge_id,
        "expires_in_seconds": settings.otp_expire_seconds,
        "cooldown_seconds": settings.otp_cooldown_seconds,
        "delivery_mode": delivery_mode,
        "message": f"Verification code sent to {recipient}.",
    }

    # ONLY expose dev_code if explicit simulation is permitted and NOT in production
    if settings.is_simulation_permitted and delivery_mode.endswith("simulated"):
        response["dev_code"] = code

    return response


def verify_otp_challenge(
    challenge_id: str,
    recipient: str,
    code: str,
) -> dict[str, Any]:
    now = int(time.time())
    record = OTP_CHALLENGES.get(challenge_id)

    if not record:
        return {"ok": False, "error": "Invalid or expired verification session."}

    if record["recipient"] != recipient.strip().lower():
        return {"ok": False, "error": "Verification recipient mismatch."}

    if record["expires_at"] < now:
        del OTP_CHALLENGES[challenge_id]
        return {"ok": False, "error": "Verification code has expired. Please request a new one."}

    if record["attempts"] >= settings.otp_max_attempts:
        del OTP_CHALLENGES[challenge_id]
        return {
            "ok": False,
            "error": "Maximum verification attempts exceeded. Please request a new code.",
        }

    record["attempts"] += 1
    expected_hash = _hash_otp(code.strip(), record["salt"])

    if not hmac.compare_digest(expected_hash, record["code_hash"]):
        remaining = settings.otp_max_attempts - record["attempts"]
        return {
            "ok": False,
            "error": f"Incorrect verification code. {remaining} attempt(s) remaining.",
        }

    # Atomic single-use consumption on success
    purpose = record["purpose"]
    del OTP_CHALLENGES[challenge_id]

    session_token = create_token(
        user_id=recipient,
        role="patient",
        extra={"verified": True, "purpose": purpose},
    )

    return {
        "ok": True,
        "session_token": session_token,
        "message": "Verification successful.",
    }