import pytest
from fastapi.testclient import TestClient

from app.core.auth import create_token
from app.main import app

client = TestClient(app)


def test_guest_session_issuance():
    resp = client.post("/api/auth/guest-session")
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert "guest_id" in data
    assert data["role"] == "guest"


def test_ai_consent_gate_deterministic_fallback():
    # Calling AI clinical summary without consent must NOT call external LLM
    guest_token = create_token("guest-patient-consent", role="guest")
    headers = {"Authorization": f"Bearer {guest_token}"}

    payload = {
        "complaint": {"displayName": "Headache with fever", "originalInput": "Patient reports severe headache and fever for 2 days."},
        "history": {"duration": "2 days", "severity": "moderate"},
        "consent_obtained": False,
    }

    resp = client.post("/api/ai/summarize", json=payload, headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["provider"] == "deterministic-evidence-template"
    assert res_data["consent_applied"] is False
    assert "Headache with fever" in res_data["summary"]
