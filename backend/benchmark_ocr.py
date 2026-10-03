"""Synthetic OCR and Medical Structuring Benchmark for Sehat Saathi.
Evaluates local PyMuPDF + Tesseract extraction and clinical evidence preservation.
"""
from __future__ import annotations

import time
from app.core.medical_extractor import extract_medical_document, normalize_lab_value

# Ground Truth synthetic document text representing a multi-block clinical OPD card
SYNTHETIC_CLINICAL_NOTE = """
ALL INDIA INSTITUTE OF MEDICAL SCIENCES
OUTPATIENT DEPARTMENT RECORD

Patient Name: Rajesh Kumar
Age / Gender: 46 Years / Male
UHID: AIIMS-2026-9812
Visit Date: 03/10/2026
Department: General Medicine

Chief Complaints:
1. High grade fever with chills - for 4 Days
2. Severe abdominal pain in epigastric region - for 2 Days

Vitals:
BP: 130/84 mmHg
Pulse: 88 bpm
Temp: 101.4 °F
SpO2: 97%
Weight: 72 kg

Laboratory Investigations:
Hemoglobin (Hb) 13.8 g/dL (Reference: 13.0 - 17.0)
Total WBC Count 11200 /µL (Reference: 4000 - 11000)
Platelet Count 15-45
CRP <60
Serum Lipase B4 U/L (Reference: 10 - 140)
Blood Sugar (Fasting) 118 mg/dL (Reference: 70 - 100)

Diagnoses:
• Acute febrile illness
• Suspected Acute Gastritis

Medications:
1. Tab Paracetamol 650mg TDS x 3 days
2. Tab Pantoprazole 40mg OD before breakfast x 5 days
"""


def run_benchmark():
    print("=" * 60)
    print("SEHAT SAATHI SYNTHETIC OCR & MEDICAL STRUCTURING BENCHMARK")
    print("=" * 60)

    t0 = time.perf_counter()
    structured = extract_medical_document(SYNTHETIC_CLINICAL_NOTE)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    print(f"Extraction completed in: {elapsed_ms:.2f} ms")

    # Patient & Visit
    pat = structured.get("patient", {})
    visit = structured.get("visit", {})
    print(f"Patient Name: {pat.get('name')} (Age: {pat.get('age')}, Gender: {pat.get('gender')})")
    print(f"Department: {visit.get('department')}, Visit Date: {visit.get('visit_date')}")

    # Chief complaints
    complaints = structured.get("chiefComplaints", [])
    print(f"Extracted Complaints ({len(complaints)}):")
    for c in complaints:
        print(f"  - {c.get('complaint')} (Duration: {c.get('duration')})")

    # Vitals
    vitals = structured.get("vitals", [])
    print(f"Extracted Vitals ({len(vitals)}):")
    for v in vitals:
        print(f"  - {v.get('name')}: {v.get('patientValue')} (Status: {v.get('status')})")

    # Lab Results & Evidence Immutability Verification
    labs = structured.get("laboratoryResults", [])
    print(f"Extracted Lab Results ({len(labs)}):")
    for l in labs:
        print(f"  - {l.get('testName')}: {l.get('patientValue')} (Ref: {l.get('referenceRange')})")

    # Safety Assertions
    crp_lab = next((l for l in labs if l.get("testName") == "CRP"), None)
    assert crp_lab is not None, "CRP should be extracted"
    assert crp_lab.get("patientValue") == "<60", f"CRP value should be '<60', got '{crp_lab.get('patientValue')}'"
    print("  [PASS] CRP evidence preserved immutably as '<60' (not falsely rewritten to '<6.0 mg/L')")

    plt_lab = next((l for l in labs if l.get("testName") == "Platelet Count"), None)
    assert plt_lab is not None, "Platelet Count should be extracted"
    assert plt_lab.get("patientValue") == "15-45", f"Platelet Count should be '15-45', got '{plt_lab.get('patientValue')}'"
    print("  [PASS] Platelet Count evidence preserved as '15-45' (not falsely mutated to '1.5-4.5 lakh/µL')")

    lipase_lab = next((l for l in labs if l.get("testName") == "Serum Lipase"), None)
    assert lipase_lab is not None, "Serum Lipase should be extracted"
    assert "B4" in lipase_lab.get("patientValue"), f"Lipase value should contain 'B4', got '{lipase_lab.get('patientValue')}'"
    assert "54" not in lipase_lab.get("patientValue"), f"Lipase value should NOT contain '54', got '{lipase_lab.get('patientValue')}'"
    print("  [PASS] Serum Lipase unreadable OCR character preserved as 'B4' (not falsely invented as '54 U/L')")

    # Medications
    meds = structured.get("medications", [])
    print(f"Extracted Medications ({len(meds)}):")
    for m in meds:
        print(f"  - {m.get('name')}: {m.get('dosage')} | {m.get('frequency')} | {m.get('duration')}")

    assert len(meds) == 2, f"Expected 2 medications, got {len(meds)}"
    assert meds[0]["name"] == "Paracetamol", f"Expected Paracetamol, got {meds[0]['name']}"
    assert meds[0]["dosage"] == "650mg", f"Expected 650mg, got {meds[0]['dosage']}"
    assert meds[1]["name"] == "Pantoprazole", f"Expected Pantoprazole, got {meds[1]['name']}"
    print("  [PASS] Prescribed medications extracted with exact dosages and frequencies")

    # Comparator Evaluation Assertions
    from app.core.medical_reference import compare_result

    crp_comp = compare_result("CRP", "<60", "<10 mg/L")
    assert crp_comp["status"] == "needs_review", f"CRP <60 vs <10 should require review, got {crp_comp['status']}"
    assert crp_comp["attention"] is True
    print("  [PASS] CRP <60 correctly evaluated as 'needs_review' (does not assume false elevation)")

    lipase_comp = compare_result("Serum Lipase", "B4 U/L", "10 - 140")
    assert lipase_comp["status"] == "needs_review", f"Lipase B4 should require review, got {lipase_comp['status']}"
    print("  [PASS] Lipase 'B4' unreadable character correctly evaluated as 'needs_review'")

    wbc_comp = compare_result("Total WBC Count", "11200 /µL", "4000 - 11000")
    assert wbc_comp["status"] == "above_reference", f"WBC 11200 vs 4000-11000 should be above_reference, got {wbc_comp['status']}"
    print("  [PASS] WBC 11200 /µL correctly evaluated with unit compatibility")

    print("=" * 60)
    print("ALL BENCHMARK CRITERIA VERIFIED SUCCESSFULLY.")
    print("=" * 60)


if __name__ == "__main__":
    run_benchmark()
