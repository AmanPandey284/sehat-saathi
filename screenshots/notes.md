# Sehat Saathi — PPT Screenshot Notes

## Demo Patient Details

| Field | Value |
|---|---|
| **Full Name** | Arjun Mehta |
| **Age** | 34 years |
| **Sex** | Male |
| **ABHA ID** | ABHA-34-7721-9801 |
| **Language** | English (primary) |
| **Emergency Contact** | Priya Mehta (Wife) — 9812345678 |
| **Known Condition** | Hypertension (controlled) |
| **Current Medication** | Amlodipine 5mg OD |
| **Allergies** | No known drug allergies |

### Chief Complaint (Arjun — screenshots 01–04, 06)
> "I have been feeling very dizzy and lightheaded for 3 days. The room spins around me."

**Structured complaint:** Dizziness and Vertigo  
**Suggested routing:** Neurology  
**Urgency:** Routine

---

## Emergency Demo Patient (screenshot 05 only)

| Field | Value |
|---|---|
| **Full Name** | Suresh Kumar |
| **Age** | 58 years |
| **Sex** | Male |
| **ABHA ID** | ABHA-58-3312-7400 |
| **Emergency Contact** | Kavitha Kumar (Wife) — 9900112233 |
| **Chief Complaint** | Severe chest pain and breathlessness |
| **Past Medical** | Type 2 Diabetes (8 yrs), Hypertension |
| **Past Medications** | Metformin 1g BD, Telmisartan 40mg OD |

---

## Fake Prescription Details

**Filename:** `Prescription_Dr_Kapoor_09Sep2026.jpg`  
**Clinic:** Dr. Kapoor's General Practice (fictional)  
**Doctor:** Dr. R. Kapoor, MBBS MD  
**Date:** 09 September 2026  
**Patient:** Arjun Mehta, 34M  
**Diagnosis:** Benign Positional Vertigo  

| Medication | Dose | Route |
|---|---|---|
| Tab Betahistine | 16mg BD × 2 weeks | Oral |
| Tab Stemetil | 5mg TDS × 5 days | Oral |
| Vit D3 | 60000 IU weekly × 4 | Oral |
| Tab Flunarizine | 5mg OD HS | Oral |

---

## Screenshot Manifest

| Filename | What It Shows | Status |
|---|---|---|
| `01_adaptive_question.png` | Adaptive yes/no question: **"Have you actually fainted or lost consciousness?"** (Question 1 of 2 for Dizziness). **No** option is selected (green background, ✓ checkmark). Label: "RELEVANT FOLLOW-UP". | ✅ PASS |
| `02_physician_summary.png` | Physician Review Portal — Arjun Mehta card selected. Physician-ready clinical summary visible: Chief Complaint, History of Present Illness with structured fields (Loss of consciousness: No, Worse on standing: Yes, Duration: 3 days, Severity: 4). Hospital routing: Neurology (Suggested). | ✅ PASS |
| `03_provenance.png` | "Original patient evidence" panel — three evidence cards visible: **LOSS OF CONSCIOUSNESS** ("No, I have not fainted." → Normalized: no), **WORSE ON STANDING** ("yes, definitely worse on standing" → Normalized: yes), **DURATION** ("3 days" → Normalized: 3 days). Shows source traceability. | ✅ PASS |
| `04_document_review.png` | "Previous medical records" tab with Document evidence register. **Prescription_Dr_Kapoor_09Sep2026.jpg** is listed with all 4 extracted medications (Betahistine, Stemetil, Vit D3, Flunarizine), Diagnosis: Benign Positional Vertigo, Date: 09 Sep 2026. All with confidence levels. | ✅ PASS |
| `05_emergency_flow.png` | **Emergency screen** (Suresh Kumar — chest pain + breathlessness). Dark red background, heading: **"Immediate Triage Recommended"**. Two red-flag cards: "Severe chest pain reported" and "Breathing difficulty reported". Emergency Assistance (India): dial 108. | ✅ PASS |
| `06_returning_patient.png` | **"What Has Changed?"** returning-patient screen — Arjun Mehta's second visit. "FOLLOW-UP COMPARISON: Dizziness and vertigo — How is this problem compared with your previous visit?" with **Better** selected. Known Medical Conditions (Hypertension: No change). Known Medications (Amlodipine, Betahistine, Stemetil, Vit D3 — all "Still taking"). | ✅ PASS |
| `07_hindi_interface.png` | **Hindi interface** — Chief Complaint screen: "आप आज यहाँ किस समस्या के लिए आए हैं?" (What brings you here today?). Logo reads "सेहत साथी". Hindi toggle active (highlighted). All UI text in Hindi including quick options: पेट दर्द, बुखार, खांसी. | ✅ PASS |

---

## Key Clinical Proof Points Visible in Screenshots

- **`01_adaptive_question.png`**: The exact question "Have you actually fainted or lost consciousness?" is shown with the **"No"** option selected in green (✓ No). This is the `dizziness_faint` adaptive question from `adaptiveQuestionBank.ts`.
- **`02_physician_summary.png`**: The physician summary shows `Loss of consciousness: No [source: patient; unverified]` — proving the semantic label is applied correctly and not dumped into "Additional Notes".
- **`03_provenance.png`**: The "LOSS OF CONSCIOUSNESS" evidence card shows the original patient wording ("No, I have not fainted.") with its normalized value ("no") — full provenance chain preserved.
- **`05_emergency_flow.png`**: Emergency escalation is triggered by `chestPain: yes` + `breathingDifficulty: yes` in the safetyEngine, with no historical safety flags carrying over.
- **`06_returning_patient.png`**: The returning patient sees their previous visit's verified data (conditions, medications) as baseline — confirms the "What changed?" flow works and shows real structured data.

---

*Generated for SIH2025 Hackathon demo. All patient data is entirely fictional.*
