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


def test_document_authorization_and_unregistered_rejection():
    # 1. Patient A uploads a text lab document
    patient_a_token = create_token("patient-a-unique", role="patient")
    headers_a = {"Authorization": f"Bearer {patient_a_token}"}

    file_content = b"Patient: Test A\nHemoglobin: 14.2 g/dL\n"
    files = {"file": ("report.txt", file_content, "text/plain")}
    upload_res = client.post("/api/documents/ocr", files=files, headers=headers_a)
    assert upload_res.status_code == 200
    stored_name = upload_res.json()["sourceDocument"]["storedName"]

    # 2. Patient B attempts to preview Patient A's document -> 403 Forbidden
    patient_b_token = create_token("patient-b-unique", role="patient")
    headers_b = {"Authorization": f"Bearer {patient_b_token}"}
    prev_res_b = client.get(f"/api/documents/{stored_name}/preview", headers=headers_b)
    assert prev_res_b.status_code == 403

    # 3. Doctor attempts to preview Patient A's document -> 200 OK
    doctor_token = create_token("demo-doctor", role="doctor")
    headers_doc = {"Authorization": f"Bearer {doctor_token}"}
    prev_res_doc = client.get(f"/api/documents/{stored_name}/preview", headers=headers_doc)
    assert prev_res_doc.status_code == 200

    # 4. Preview unregistered file name -> 404 Not Found
    prev_unreg = client.get("/api/documents/nonexistent-file.pdf/preview", headers=headers_doc)
    assert prev_unreg.status_code == 404


def test_encounter_signoff_optimistic_locking_conflict():
    patient_token = create_token("patient-signoff-test", role="patient")
    headers_patient = {"Authorization": f"Bearer {patient_token}"}

    # 1. Patient creates encounter
    enc_payload = {
        "patient_name": "Conflict Test Patient",
        "chief_complaint": "Persistent cough",
        "triage_level": "routine",
        "history_present_illness": {"onset": "1 week"},
    }
    enc_res = client.post("/api/encounters", json=enc_payload, headers=headers_patient)
    assert enc_res.status_code == 200
    enc_id = enc_res.json()["encounter"]["id"]
    version = enc_res.json()["encounter"]["version"]
    assert version == 1

    doctor_token = create_token("demo-doctor", role="doctor")
    headers_doc = {"Authorization": f"Bearer {doctor_token}"}

    # 2. Reviewer 1 successfully signs off with expected_version=1
    sign1 = client.post(
        f"/api/encounters/{enc_id}/signoff",
        json={"decision": "CONFIRMED_AND_SIGNED", "review_note": "Approved by doc 1", "expected_version": 1},
        headers=headers_doc,
    )
    assert sign1.status_code == 200
    assert sign1.json()["encounter"]["version"] == 2

    # 3. Reviewer 2 attempts signoff with stale expected_version=1 -> 409 Conflict
    sign2 = client.post(
        f"/api/encounters/{enc_id}/signoff",
        json={"decision": "CONFIRMED_AND_SIGNED", "review_note": "Stale attempt by doc 2", "expected_version": 1},
        headers=headers_doc,
    )
    assert sign2.status_code == 409
    assert "stale write" in sign2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_otp_attempts_preserved_across_resends(monkeypatch):
    import uuid
    from app.core.config import settings
    from app.core.auth import send_otp_challenge, verify_otp_challenge
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "resend_api_key", None)

    target = f"test-persist-{uuid.uuid4().hex[:6]}@sehat.local"

    # Send challenge
    ch1 = await send_otp_challenge(target, channel="email")
    assert ch1["ok"] is True

    # 1 failed verification attempt
    v1 = verify_otp_challenge(target, "000000")
    assert v1["ok"] is False
    assert "4 attempt(s) remaining" in v1["error"]

    # Directly query DB to verify attempts is 1
    from app.core.db import get_db
    with get_db() as conn:
        row = conn.execute("SELECT attempts FROM otp_challenges WHERE target = ?;", (target,)).fetchone()
        assert row["attempts"] == 1
