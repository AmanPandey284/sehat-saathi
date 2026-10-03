import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.auth import (
    create_token,
    send_otp_challenge,
    verify_otp_challenge,
    hash_password,
    verify_password,
)
from app.main import app

client = TestClient(app)


def test_password_hashing_roundtrip():
    hashed = hash_password("Secret123!")
    assert "$" in hashed
    assert verify_password("Secret123!", hashed) is True
    assert verify_password("WrongPassword", hashed) is False


@pytest.mark.asyncio
async def test_otp_simulation_disallowed_in_production(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "resend_api_key", None)
    monkeypatch.setattr(settings, "otp_simulation_allowed", False)

    res = await send_otp_challenge("test@example.com", channel="email")
    assert res["ok"] is False
    assert "dev_code" not in res
    assert res["delivery_mode"] == "unavailable"


@pytest.mark.asyncio
async def test_otp_development_simulation_and_verification(monkeypatch):
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "resend_api_key", None)

    res = await send_otp_challenge("dev_user@example.com", channel="email")
    assert res["ok"] is True
    assert "dev_code" in res
    code = res["dev_code"]
    cid = res["challenge_id"]

    # Wrong recipient must fail
    bad_recip = verify_otp_challenge(cid, "other@example.com", code)
    assert bad_recip["ok"] is False

    # Wrong code must fail
    bad_code = verify_otp_challenge(cid, "dev_user@example.com", "000000")
    assert bad_code["ok"] is False

    # Correct verification must succeed and return token
    success = verify_otp_challenge(cid, "dev_user@example.com", code)
    assert success["ok"] is True
    assert "session_token" in success

    # Atomic single use: second verification must be rejected
    repeat = verify_otp_challenge(cid, "dev_user@example.com", code)
    assert repeat["ok"] is False


def test_session_me_endpoint():
    token = create_token("doctor-001", role="doctor", extra={"doctor_status": "approved", "name": "Dr. Ramesh"})
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "doctor"
    assert data["doctor_status"] == "approved"


def test_admin_authorization_gating():
    patient_token = create_token("patient-123", role="patient")
    doctor_token = create_token("doctor-001", role="doctor", extra={"doctor_status": "approved"})
    admin_token = create_token("admin-001", role="admin")

    # Patient token attempting admin action must be rejected with 403
    resp_pat = client.get("/api/auth/doctor/applications", headers={"Authorization": f"Bearer {patient_token}"})
    assert resp_pat.status_code == 403

    # Doctor token attempting admin action must be rejected with 403
    resp_doc = client.get("/api/auth/doctor/applications", headers={"Authorization": f"Bearer {doctor_token}"})
    assert resp_doc.status_code == 403

    # Admin token must succeed
    resp_adm = client.get("/api/auth/doctor/applications", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp_adm.status_code == 200
    assert isinstance(resp_adm.json(), list)
