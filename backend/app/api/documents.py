from __future__ import annotations

import io
import os
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".pdf", ".txt", ".csv", ".md"}
MAX_FILE_BYTES = 8 * 1024 * 1024


def _ext(name: str) -> str:
    return os.path.splitext(name.lower())[1]


def _extract_entities(text: str) -> list[dict[str, Any]]:
    entities: list[dict[str, Any]] = []
    low = text.lower()
    med_names = [
        "metformin", "paracetamol", "amoxicillin", "azithromycin", "amlodipine",
        "losartan", "insulin", "omeprazole", "pantoprazole", "atorvastatin",
        "levothyroxine", "salbutamol", "cetirizine"
    ]
    diagnosis_names = [
        "diabetes", "hypertension", "asthma", "tuberculosis", "anemia", "anaemia",
        "infection", "pneumonia", "thyroid", "arthritis"
    ]
    procedure_words = ["surgery", "operation", "appendectomy", "biopsy", "dialysis", "angioplasty"]

    def snippet(term: str) -> str:
        m = re.search(rf".{{0,45}}{re.escape(term)}.{{0,45}}", text, flags=re.I | re.S)
        return (m.group(0).replace("\n", " ") if m else term).strip()

    for term in med_names:
        if term in low:
            entities.append({"type": "Medication", "value": term.title(), "confidence": "high", "sourceText": snippet(term)})
    for term in diagnosis_names:
        if term in low:
            entities.append({"type": "Diagnosis/History", "value": term.title(), "confidence": "medium", "sourceText": snippet(term)})
    for term in procedure_words:
        if term in low:
            entities.append({"type": "Procedure", "value": term.title(), "confidence": "medium", "sourceText": snippet(term)})

    lab_patterns = [
        r"(?P<name>Hemoglobin|Hb|Glucose|WBC|Platelets|Creatinine|TSH|T3|T4|Blood Pressure|BP)\s*[:=-]\s*(?P<value>-?\d+(?:\.\d+)?)\s*(?P<unit>mg/dL|g/dL|mmol/L|10\^3/uL|10\^9/L|mmHg|mIU/L|%)?",
    ]
    for pattern in lab_patterns:
        for m in re.finditer(pattern, text, flags=re.I):
            value = m.group("value")
            unit = m.group("unit") or ""
            entities.append({
                "type": "Investigation",
                "value": f"{m.group('name')}: {value} {unit}".strip(),
                "confidence": "high",
                "sourceText": m.group(0).strip(),
            })

    dates = re.findall(r"\b(?:\d{1,2}[/-])?(?:\d{1,2}[/-])?\d{4}\b", text)
    for d in dates[:8]:
        entities.append({"type": "Date", "value": d, "confidence": "high", "sourceText": d})
    return entities[:50]


def _ocr_image(data: bytes, filename: str) -> tuple[str, list[dict[str, Any]]]:
    try:
        import pytesseract
        from PIL import Image, ImageOps
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"OCR dependencies unavailable: {exc}")
    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
        image = ImageOps.exif_transpose(image)
        image.thumbnail((2400, 2400))
        # Prefer bilingual OCR; fall back to English if Hindi traineddata isn't installed.
        try:
            text = pytesseract.image_to_string(image, lang="eng+hin")
        except Exception:
            text = pytesseract.image_to_string(image, lang="eng")
        return text.strip(), [{"page": 1, "text": text.strip(), "confidence": "medium"}]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not OCR {filename}: {exc}")


def _process_pdf(data: bytes, filename: str) -> tuple[str, list[dict[str, Any]]]:
    try:
        import fitz
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"PDF support unavailable: {exc}")
    doc = fitz.open(stream=data, filetype="pdf")
    pages: list[dict[str, Any]] = []
    all_text: list[str] = []
    for idx, page in enumerate(doc):
        text = page.get_text("text").strip()
        if not text:
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
            text, _ = _ocr_image(pix.tobytes("png"), f"{filename}-page-{idx+1}.png")
        pages.append({"page": idx + 1, "text": text, "confidence": "medium"})
        if text:
            all_text.append(text)
    return "\n\n".join(all_text), pages


@router.post("/ocr")
async def ocr_document(file: UploadFile = File(...)) -> dict[str, Any]:
    name = file.filename or "document"
    ext = _ext(name)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported document type")
    data = await file.read()
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large; maximum is 8 MB")

    pages: list[dict[str, Any]] = []
    text = ""
    status = "extracted"
    if ext in {".txt", ".csv", ".md"}:
        text = data.decode("utf-8", errors="replace")
        pages = [{"page": 1, "text": text, "confidence": "high"}]
    elif ext == ".pdf":
        text, pages = _process_pdf(data, name)
    else:
        text, pages = _ocr_image(data, name)

    return {
        "name": name,
        "type": ext.lstrip("."),
        "processedAt": datetime.now(timezone.utc).isoformat(),
        "extractionStatus": status,
        "text": text,
        "pages": pages,
        "entities": _extract_entities(text),
    }
