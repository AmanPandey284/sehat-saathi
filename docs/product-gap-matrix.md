# Sehat Saathi vs. AyurDoc: Product Capability & Gap Matrix (v2)
**Project:** Sehat Saathi (Smart India Hackathon 2026 — PS ID: SIH26047)  
**Reference Analysis:** Source-verified comparative audit of AyurDoc client bundle and APIs  
**Verification Baseline:** Full Vitest Frontend Suite + Pytest Backend Security & Normalization Suite

---

## 1. Product Capability Gap Matrix

| # | Capability | AyurDoc Evidence Level | Sehat Saathi Implementation | Concrete Files in Tree | Implementation Decision | Acceptance Check & Test Proof | Implementation Status |
|---|---|---|---|---|---|---|---|
| **1** | **Role-Aware Access & Entry Choices** | Client bundle tab switcher (`role` state, patient/doctor) | Canonical role landing with three distinct choices: Quick Guest Intake, Patient OTP Login, and Physician Portal | `src/pages/AuthLanding.tsx`, `src/pages/PatientLanding.tsx`, `src/App.tsx` | **IMPROVED** | `/auth`, `/patient/login`, `/patient/entry`, and `/doctor/login` routes functional and tested. | ✅ IMPLEMENTED |
| **2** | **Server-Side OTP Verification & Resend** | Resend email API integration, 6-digit code, 5-min expiry | Production-gated OTP engine: Resend email delivery with strict production fail-closed semantics, no dev codes in prod, and development simulation | `backend/app/core/auth.py`, `backend/app/api/auth.py`, `src/pages/PatientLogin.tsx`, `src/pages/PatientOtp.tsx` | **IMPLEMENTED** | Pytest verified: production missing credentials fails closed, dev simulation succeeds, single-use atomic consumption passes. | ✅ IMPLEMENTED |
| **3** | **Structured Physician Onboarding & Administrative Approval** | Doctor registration endpoint with review queue | Physician self-registration (name, council registration, medical system, specialty) gated by server-side administrator authorization | `src/pages/DoctorRegister.tsx`, `backend/app/api/auth.py`, `backend/app/core/auth.py` | **IMPLEMENTED** | Form routes to `/doctor/register`, saves to durable store, `/doctor/applications` and `/doctor/verify` require admin tokens. | ✅ IMPLEMENTED |
| **4** | **Step-by-Step Interactive Walkthrough** | Modal guide with multi-step explanation | Step-by-step interactive walkthrough with numbered progress, Back/Next/Skip navigation, and replayability | `src/pages/PatientHelp.tsx`, `src/pages/PatientLanding.tsx` | **PARTIAL** | Guided help screens integrated; interactive inline tour modal planned for kiosk idle state. | ⚠️ PARTIAL |
| **5** | **Public Guided Triage Assistant** | Sidebar conversational guide | 9-system adaptive questionnaire with immediate red-flag safety triage | `src/features/patient/ChiefComplaintFlow.tsx`, `src/features/safety/safetyEngine.ts` | **IMPLEMENTED** | Real-time red-flag evaluation halts routine intake and redirects to emergency guidance. | ✅ IMPLEMENTED |
| **6** | **High-Precision OCR & Multipage PDF Pipeline** | OpenAI vision extraction candidate in client bundle | Dual-engine OCR: native digital PyMuPDF extraction + bounded rasterizer (150 DPI) + configurable OpenAI Vision candidate fallback | `backend/app/api/documents.py`, `backend/app/core/medical_extractor.py` | **IMPLEMENTED** | Character/field benchmark verified: `<60` preserved immutably, unreadable characters preserved, private preview/download endpoints active. | ✅ IMPLEMENTED |
| **7** | **Interactive Document Field Review Workstation** | Entity display cards | Side-by-side workstation with image zoom (+/-), 90° rotation, page selector, entity status chips (`DOCUMENT_EXTRACTED`, `USER_CORRECTED`, `PHYSICIAN_VERIFIED`) | `src/features/documents/DocumentUpload.tsx` | **IMPLEMENTED** | Review workstation renders document preview, allows field correction, and retains raw OCR inspection stream. | ✅ IMPLEMENTED |
| **8** | **Medication Safety & Interaction Review** | Rule check against openFDA product labels | Dedicated Medication Safety tab checking NSAID/renal, beta-blocker/asthma risks with explicit clinical scope notice | `src/features/doctor/DoctorDashboard.tsx` | **IMPLEMENTED** | Labeled as preliminary rule-based screening prototype; requires clinician pharmacopoeia verification. | ✅ IMPLEMENTED |
| **9** | **Physician Review Decision & Record Sign-Off** | Review status toggles (`confirmed` / `rejected`) | Top Physician Decision Bar (*Confirm & Sign*, *Request Clarification*, *Flag Case*), clinical notes editor, and timestamped audit log | `src/features/doctor/DoctorDashboard.tsx`, `backend/app/api/encounters.py`, `backend/app/core/db.py` | **IMPLEMENTED** | Transactional SQLite storage (`data/sehat_saathi.db`) with WAL mode, optimistic locking (`version`), reviewer ID audit trail, and physician role verification. | ✅ IMPLEMENTED |
| **10** | **Emergency Bed & Blood Quick-Fill Triage** | Standalone hospital triage forms | Emergency triage screen with direct 108 / 112 dialing and explicit prototype simulation disclaimers | `src/pages/EmergencyScreen.tsx` | **IMPLEMENTED** | Operational claims removed; simulated demo tickets clearly labeled without claiming real ER dispatch. | ✅ IMPLEMENTED |
| **11** | **Outpatient Doctor Directory & OPD Booking** | Doctor cards and schedule booking | Full outpatient specialist directory (Allopathy & AYUSH) with department filters, language tags, and appointment conflict detection | `src/pages/DoctorDirectory.tsx`, `src/pages/AppointmentBooking.tsx` | **IMPLEMENTED** | Navigable at `/doctors` and `/appointments`; books conflict-free consultation tokens. | ✅ IMPLEMENTED |
| **12** | **Voice Message to Doctor with Editable Transcription** | Audio element recording | Browser MediaRecorder voice consultation recorder with playback, timer, and editable transcript | `src/pages/VoiceConsultation.tsx` | **IMPLEMENTED** | Navigable at `/patient/voice`; records audio, enables editing of transcription, and commits to chief complaint. | ✅ IMPLEMENTED |
| **13** | **ABHA ID Formatting & ABDM Kiosk Consent** | 14-digit format and consent checkbox | 14-digit auto-hyphenated ABHA formatter, self-reported unverified label, unselected-by-default consent, and NHA portal link | `src/pages/PatientProfile.tsx` | **IMPLEMENTED** | Self-reported status shown; consent left unselected until user acts; Aadhaar privacy guarantee displayed. | ✅ IMPLEMENTED |
| **14** | **Classical AYUSH Clinical Intake** | Generic questionnaire | Comprehensive 36-question classical intake covering *Dasavidha*, *Ashtavidha Pariksha*, Agni, Koshtha, Ahara-Vihara | `src/pages/AyushMode.tsx`, `src/features/doctor/DoctorDashboard.tsx` | **PRESERVED** | Traditional medicine history collected structured for practitioner review without autonomous diagnosis claims. | ✅ IMPLEMENTED |
| **15** | **Zero-Repetition Longitudinal Returning Patient Delta** | Absent in reference | Multi-visit longitudinal delta tracking (*better / worse / same / new symptoms*) with chronic baseline isolation | `src/features/patient/returningPatientModel.ts`, `src/pages/ReturningPatientChanges.tsx` | **PRESERVED** | Preserved longitudinal delta tracking and historical safety isolation across repeat consultations. | ✅ IMPLEMENTED |
| **16** | **Passkey / Hardware WebAuthn** | WebAuthn library references | Standard session token authentication with HMAC signatures | `backend/app/core/auth.py` | **OMITTED** | Omitted due to offline kiosk compatibility; replaced with server-side HMAC OTP challenge. | 🚫 OMITTED (Offline Kiosk Compatibility) |

---

## 2. Architectural Principles & Safety Model

1. **Clinical Decision Support Boundary:** Sehat Saathi is an intelligent clinical intake assistant, **not** an autonomous diagnostician or prescribing physician.
2. **Deterministic Safety Primacy:** Red-flag clinical triggers evaluate immediately upon entry and cannot be overridden by statistical AI models.
3. **Data Provenance Separation:** Every clinical entity is tagged with its origin: `PATIENT_REPORTED`, `DOCUMENT_EXTRACTED`, `USER_CORRECTED`, or `PHYSICIAN_VERIFIED`.
4. **Clinical Evidence Immutability:** OCR processing never silently alters or guesses extracted lab numbers or units. Original document text is preserved as verifiable evidence.
5. **Fail-Closed Production Security:** In production, missing credentials or delivery errors fail closed without exposing simulated codes.

---

## 3. Startup & Verification Commands

```bash
# 1. Run Backend Pytest Suite (Security, Auth, Normalization)
cd backend
python -m pytest tests/

# 2. Run Synthetic OCR Benchmark
python benchmark_ocr.py

# 3. Start Backend FastAPI Server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 4. Run Frontend Unit Test Suite (604 Passing Tests)
npm test -- --run

# 5. Build Frontend Production Bundle
npm run build

# 6. Start Vite Dev Server with /api Proxy
npm run dev -- --host 127.0.0.1 --port 5173
```
