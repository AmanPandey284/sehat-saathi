import pytest
from fastapi.testclient import TestClient

from app.core.auth import create_token
from app.main import app

client = TestClient(app)


def test_doctor_directory_listing():
    resp = client.get("/api/doctors")
    assert resp.status_code == 200
    docs = resp.json()
    assert isinstance(docs, list)


import uuid

def test_appointment_booking_and_double_booking_conflict():
    unique_doc_id = f"doc-test-{uuid.uuid4().hex[:6]}"
    guest_token = create_token("guest-patient-test", role="guest", extra={"purpose": "intake"})
    headers = {"Authorization": f"Bearer {guest_token}"}

    booking_payload = {
        "doctor_id": unique_doc_id,
        "doctor_name": "Dr. Test Specialist",
        "department": "General Medicine",
        "patient_name": "Test Patient",
        "patient_phone": "9876543210",
        "date": "2026-10-15",
        "time_slot": "10:30 AM",
    }

    # First booking should succeed
    res1 = client.post("/api/appointments", json=booking_payload, headers=headers)
    assert res1.status_code == 200
    ticket = res1.json()
    assert ticket["status"] == "CONFIRMED"
    assert ticket["timeSlot"] == "10:30 AM"

    # Second booking for the same doctor, date, and slot must fail with 409 Conflict
    res2 = client.post("/api/appointments", json=booking_payload, headers=headers)
    assert res2.status_code == 409
    assert "already been booked" in res2.json()["detail"].lower()

    # Query availability endpoint to verify slot is reported booked
    avail = client.get(
        f"/api/appointments/availability?doctor_id={unique_doc_id}&date=2026-10-15"
    )
    assert avail.status_code == 200
    booked_slots = avail.json().get("booked_slots", [])
    assert "10:30 AM" in booked_slots
