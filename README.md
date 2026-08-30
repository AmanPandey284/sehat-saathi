# Sehat Saathi — SIH26047 Prototype

Sehat Saathi is a patient-facing pre-consultation clinical intake prototype. It collects a patient's chief complaint and structured history through adaptive questions, supports English/Hindi and browser voice input, flags configured safety concerns, lets patients review their record, processes prior medical documents through a FastAPI OCR service, and provides a physician review dashboard with provenance, verification, conflict detection, timeline and FHIR-ready export.

## Run locally

### Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

OCR support uses Tesseract through `pytesseract`. Install the Tesseract binary separately on the machine running the backend. Hindi OCR is used when the `hin` trained data is available; the backend falls back to English OCR when it is not.

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The backend API docs are at `http://127.0.0.1:8000/docs`.

## Implemented prototype scope

- patient consent + profile with a prototype session identifier (no ABHA ID field)
- adaptive flows: abdominal pain, fever, cough, plus a safe custom/general complaint path, plus a safe custom/general complaint path
- deterministic clinical question engine
- natural-language normalization with provenance
- browser speech input and text-to-speech where supported
- configurable red-flag safety layer with immediate routine-history stop for urgent scenarios with immediate routine-history stop for urgent scenarios
- patient review/edit
- prior document upload + OCR (image/PDF/text)
- extracted entities and source excerpts
- background history capture
- physician dashboard with editable fields and confirm/reject
- contradiction detection
- timeline
- evidence-grounded summary with optional OpenAI Responses API provider
- FHIR-ready JSON export
- AYUSH history mode with Prakriti, Agni, Koshtha and Dashavidha-style parameters

## Safety

This is a prototype for physician review. It is not a diagnostic or treatment system and should never be used as a substitute for professional clinical judgment.

No real patient data should be committed to the repository.

### Windows OCR note
The backend OCR service requires the Tesseract executable on PATH. If Tesseract is not installed, image OCR will report an explicit service-unavailable message rather than silently inventing extracted text. PDF pages with embedded text are read directly; scanned PDF pages fall back to OCR.

### Optional AI summary
Set `OPENAI_API_KEY` and `OPENAI_MODEL` in `backend/.env` to enable the optional LLM provider. Without a key, the doctor dashboard uses a deterministic, evidence-first summary generated from the structured record.
