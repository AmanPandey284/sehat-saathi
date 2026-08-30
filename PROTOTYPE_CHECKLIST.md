# Sehat Saathi Prototype Checklist

Implemented in this prototype:
- Consent-first patient journey
- Demo/ABHA-ready patient identifier field (no live ABHA verification)
- Adaptive patient history: abdominal pain, fever, cough
- Data-driven question engine with branching/back/edit
- English/Hindi UI and browser voice input/text-to-speech where supported
- Natural-language normalization with original-answer provenance
- Deterministic safety/red-flag layer with physician-review escalation
- Patient review and correction
- Background history capture
- Image/PDF/text document upload through FastAPI
- OCR for images; PDF text extraction and OCR fallback
- Clinical entity extraction: medications, diagnoses/history, investigations, dates, procedures, allergies
- Document evidence/source excerpts
- Physician dashboard with structured summary
- Real physician field editing + confirm/reject status
- Information conflict detection
- Medical timeline
- Optional evidence-grounded LLM summary provider with deterministic fallback
- FHIR-ready prototype export including patient/condition/observation/document/consent/provenance resources
- AYUSH/Dashavidha-style mode
- Prototype analytics view
- Local session persistence and end-session clearing action

Prototype limitations:
- No production ABHA/ABDM authentication or live hospital HIS integration
- No clinical validation; safety rules are prototype rules for physician review
- Browser speech recognition varies by browser/device
- OCR quality depends on Tesseract installation and trained language data
- No real patient data should be used
