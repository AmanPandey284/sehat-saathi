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
from app.core.db import get_db, hash_password, init_db, transaction, verify_password

# Ensure database and schemas are initialized
init_db()

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
    user_id = user.get("sub", "")
    role = user.get("role", "")

    # Server-side active validation for registered doctor and admin accounts
    if role == "doctor":
        doc = get_doctor_by_id(user_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Doctor account no longer exists",
            )
        if doc.get("status") != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Physician account status is not approved",
            )
        user["name"] = doc.get("name")
        user["specialty"] = doc.get("specialty")
        user["medical_system"] = doc.get("medical_system")
        user["registration_id"] = doc.get("registration_id")

    elif role == "admin":
        admin = get_account_by_id(user_id)
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Administrator account no longer exists",
            )
        if admin.get("status") != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator account status is not active",
            )
        user["name"] = admin.get("name")

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


def require_doctor_or_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if current_user.get("role") not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Physician or Administrator access required for this operation",
        )
    return current_user


def create_guest_session() -> dict[str, Any]:
    guest_id = f"guest-{secrets.token_hex(8)}"
    token = create_token(
        user_id=guest_id,
        role="guest",
        extra={"session_type": "guest_intake"},
    )
    return {
        "ok": True,
        "guest_id": guest_id,
        "token": token,
        "role": "guest",
        "expires_in_minutes": settings.access_token_expire_minutes,
    }




# ---------------------------------------------------------
# Transactional Account Management
# ---------------------------------------------------------

def get_account_by_id(user_id: str) -> dict[str, Any] | None:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM accounts WHERE id = ?;", (user_id,)).fetchone()
        return dict(row) if row else None


def get_doctor_by_id(user_id: str) -> dict[str, Any] | None:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM accounts WHERE id = ? AND role = 'doctor';", (user_id,)).fetchone()
        return dict(row) if row else None


def get_account_by_email(email: str) -> dict[str, Any] | None:
    clean_email = email.strip().lower()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM accounts WHERE LOWER(email) = ?;", (clean_email,)).fetchone()
        return dict(row) if row else None


def authenticate_doctor(
    email: str,
    password: str,
    registration_id: str | None = None,
) -> dict[str, Any] | None:
    clean_email = email.strip().lower()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM accounts WHERE (LOWER(email) = ? OR LOWER(id) = ?) AND role IN ('doctor', 'admin');",
            (clean_email, clean_email),
        ).fetchone()

        if not row:
            return None

        acc = dict(row)
        if not verify_password(password, acc.get("password_hash", "")):
            return None

        if registration_id and acc.get("registration_id") != registration_id:
            return None

        return acc


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
    now = int(time.time())
    with transaction() as conn:
        existing = conn.execute("SELECT id FROM accounts WHERE LOWER(email) = ?;", (clean_email,)).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A physician account with this email address already exists.",
            )

        doc_id = f"doc-{secrets.token_hex(4)}"
        pwd_hash = hash_password(password)

        conn.execute(
            """
            INSERT INTO accounts (
                id, email, password_hash, name, role, status,
                medical_system, specialty, registration_id, council_name,
                years_of_experience, hospital_name, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                doc_id,
                clean_email,
                pwd_hash,
                name.strip(),
                "doctor",
                "PENDING_REVIEW",
                medical_system.strip(),
                specialty.strip(),
                registration_number.strip(),
                council_name.strip(),
                years_of_experience,
                hospital_name.strip(),
                now,
                now,
            ),
        )

        row = conn.execute("SELECT * FROM accounts WHERE id = ?;", (doc_id,)).fetchone()
        res = dict(row)
        res.pop("password_hash", None)
        return res


def list_doctor_applications() -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM accounts WHERE role = 'doctor' ORDER BY created_at DESC;").fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d.pop("password_hash", None)
            result.append(d)
        return result


def list_approved_doctors() -> list[dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, name, email, medical_system, specialty, registration_id, council_name, years_of_experience, hospital_name FROM accounts WHERE role = 'doctor' AND status = 'approved' ORDER BY name ASC;"
        ).fetchall()
        return [dict(r) for r in rows]


def verify_doctor_application(
    doctor_id: str,
    action: str,  # approve, reject, needs_correction
    reason: str = "",
    reviewer_id: str = "admin",
) -> dict[str, Any]:
    new_status = (
        "approved" if action == "approve"
        else "rejected" if action == "reject"
        else "needs_correction"
    )
    now = int(time.time())

    with transaction() as conn:
        existing = conn.execute("SELECT * FROM accounts WHERE id = ? AND role = 'doctor';", (doctor_id,)).fetchone()
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Physician application {doctor_id} not found.",
            )

        conn.execute(
            "UPDATE accounts SET status = ?, updated_at = ? WHERE id = ?;",
            (new_status, now, doctor_id),
        )

        row = conn.execute("SELECT * FROM accounts WHERE id = ?;", (doctor_id,)).fetchone()
        res = dict(row)
        res.pop("password_hash", None)
        res["reviewed_by"] = reviewer_id
        res["reviewed_at"] = now
        res["review_reason"] = reason
        return res


# ---------------------------------------------------------
# Cryptographically Secure Durable OTP Engine
# ---------------------------------------------------------

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

    existing_attempts = 0
    # Rate limiting & cooldown checked durably in database
    with transaction() as conn:
        # Check active challenge
        row = conn.execute("SELECT * FROM otp_challenges WHERE target = ?;", (clean_recipient,)).fetchone()
        if row:
            rec = dict(row)
            if rec["expires_at"] < now:
                conn.execute("DELETE FROM otp_challenges WHERE target = ?;", (clean_recipient,))
            elif rec["cooldown_until"] > now:
                remaining = rec["cooldown_until"] - now
                return {
                    "ok": False,
                    "error": f"Please wait {remaining} seconds before requesting a new code.",
                    "cooldown_remaining": remaining,
                    "delivery_mode": "rate_limited",
                }
            elif rec["attempts"] >= settings.otp_max_attempts:
                # Still within window with max attempts
                return {
                    "ok": False,
                    "error": "Rate limit exceeded. Please wait for the current code to expire before requesting a new one.",
                    "delivery_mode": "rate_limited",
                }
            else:
                existing_attempts = rec.get("attempts", 0)

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

    code = f"{secrets.randbelow(900000) + 100000:06d}"
    salt = secrets.token_hex(8)
    code_hash = _hash_otp(code, salt)
    stored_hash = f"{salt}${code_hash}"

    with transaction() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO otp_challenges (
                target, otp_hash, attempts, expires_at, created_at, cooldown_until
            ) VALUES (?, ?, ?, ?, ?, ?);
            """,
            (
                clean_recipient,
                stored_hash,
                existing_attempts,
                now + settings.otp_expire_seconds,
                now,
                now + settings.otp_cooldown_seconds,
            ),
        )

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
                        with transaction() as conn:
                            conn.execute("DELETE FROM otp_challenges WHERE target = ?;", (clean_recipient,))
                        return {
                            "ok": False,
                            "error": "Failed to dispatch verification email via provider.",
                            "delivery_mode": "delivery_failed",
                        }
                    delivery_mode = "resend_failed_simulated"
                    sent_successfully = True
        except Exception:
            if not settings.is_simulation_permitted:
                with transaction() as conn:
                    conn.execute("DELETE FROM otp_challenges WHERE target = ?;", (clean_recipient,))
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
        with transaction() as conn:
            conn.execute("DELETE FROM otp_challenges WHERE target = ?;", (clean_recipient,))
        return {
            "ok": False,
            "error": "Delivery service unconfigured.",
            "delivery_mode": "unavailable",
        }

    response = {
        "ok": sent_successfully,
        "challenge_id": clean_recipient,
        "target": clean_recipient,
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
    target_or_cid: str = "",
    code_or_recipient: str = "",
    code_if_three: str | None = None,
    target: str | None = None,
    code: str | None = None,
) -> dict[str, Any]:
    if code_if_three is not None:
        cid = target_or_cid.strip().lower()
        actual_target = code_or_recipient.strip().lower()
        actual_code = code_if_three.strip()
        if cid != actual_target:
            return {"ok": False, "error": "Recipient mismatch for verification session."}
    elif target is not None and code is not None:
        actual_target = target.strip().lower()
        actual_code = code.strip()
    else:
        actual_target = target_or_cid.strip().lower()
        actual_code = code_or_recipient.strip()

    clean_target = actual_target
    now = int(time.time())

    with transaction() as conn:
        row = conn.execute("SELECT * FROM otp_challenges WHERE target = ?;", (clean_target,)).fetchone()
        if not row:
            return {"ok": False, "error": "Invalid or expired verification session."}

        rec = dict(row)
        if rec["expires_at"] < now:
            conn.execute("DELETE FROM otp_challenges WHERE target = ?;", (clean_target,))
            return {"ok": False, "error": "Verification code has expired. Please request a new one."}

        if rec["attempts"] >= settings.otp_max_attempts:
            conn.execute("DELETE FROM otp_challenges WHERE target = ?;", (clean_target,))
            return {
                "ok": False,
                "error": "Maximum verification attempts exceeded. Please request a new code.",
            }

        stored_hash = rec["otp_hash"]
        salt, expected_hash = stored_hash.split("$", 1)
        actual_hash = _hash_otp(actual_code.strip(), salt)

        if not hmac.compare_digest(actual_hash, expected_hash):
            new_attempts = rec["attempts"] + 1
            conn.execute("UPDATE otp_challenges SET attempts = ? WHERE target = ?;", (new_attempts, clean_target))
            remaining = settings.otp_max_attempts - new_attempts
            return {
                "ok": False,
                "error": f"Incorrect verification code. {remaining} attempt(s) remaining.",
            }

        # Atomic single-use consumption on success
        conn.execute("DELETE FROM otp_challenges WHERE target = ?;", (clean_target,))

    session_token = create_token(
        user_id=clean_target,
        role="patient",
        extra={"verified": True, "purpose": "login"},
    )

    return {
        "ok": True,
        "session_token": session_token,
        "message": "Verification successful.",
    }