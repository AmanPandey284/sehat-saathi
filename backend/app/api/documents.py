from __future__ import annotations

import asyncio
import base64
import io
import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    UploadFile,
    Depends,
    status,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import fitz  # PyMuPDF
import httpx
from PIL import Image
import pytesseract

from app.core.config import settings
from app.core.auth import get_current_user
from app.core.db import get_db, transaction
from app.core.medical_extractor import extract_medical_document


router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)


ALLOWED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".pdf",
    ".txt",
    ".csv",
    ".md",
}

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PDF_PAGES = 10                  # Bounded multi-page processing

UPLOAD_DIR = (
    Path(__file__).resolve().parents[2]
    / "uploads"
)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _ext(name: str) -> str:
    return os.path.splitext(name.lower())[1]


def _safe_filename(name: str) -> str:
    ext = _ext(name)
    return f"{uuid.uuid4().hex}{ext}"


def _validate_file_magic(data: bytes, ext: str) -> bool:
    if ext == ".pdf":
        return data.startswith(b"%PDF")
    elif ext in (".jpg", ".jpeg"):
        return data.startswith(b"\xff\xd8\xff")
    elif ext == ".png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    elif ext == ".webp":
        return len(data) > 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    elif ext in (".txt", ".csv", ".md"):
        try:
            data.decode("utf-8")
            return True
        except Exception:
            return False
    return False


def _get_mime_type(ext: str) -> str:
    mime_map = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".txt": "text/plain; charset=utf-8",
        ".csv": "text/csv; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
    }
    return mime_map.get(ext, "application/octet-stream")


def _ocr_image(data: bytes, name: str) -> tuple[str, list[dict[str, Any]]]:
    try:
        image = Image.open(io.BytesIO(data))
        # Bound dimensions to prevent memory exhaustion
        if max(image.size) > 2500:
            image.thumbnail((2500, 2500))
        text = pytesseract.image_to_string(image, lang="eng", timeout=20)
        return text, [{"page": 1, "text": text, "confidence": "tesseract_eng"}]
    except Exception as exc:
        print(f"[OCR image error] {name}: {exc}")
        return "", [{"page": 1, "text": "", "confidence": "ocr_failed"}]


def _process_pdf(data: bytes, name: str) -> tuple[str, list[dict[str, Any]], int]:
    pages: list[dict[str, Any]] = []
    text_parts: list[str] = []
    total_pages = 0

    try:
        doc = fitz.open(stream=data, filetype="pdf")
        total_pages = len(doc)
        limit = min(total_pages, MAX_PDF_PAGES)

        for i in range(limit):
            page = doc[i]
            page_text = page.get_text()
            if not page_text or len(page_text.strip()) < 20:
                # Scanned page fallback with Tesseract
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                page_text = pytesseract.image_to_string(img, lang="eng", timeout=15)
                conf = "scanned_tesseract_eng"
            else:
                conf = "native_pdf_text"

            text_parts.append(page_text)
            pages.append({"page": i + 1, "text": page_text, "confidence": conf})

        doc.close()
    except Exception as exc:
        print(f"[PDF extraction error] {name}: {exc}")

    return "\n\n".join(text_parts), pages, total_pages


async def _extract_with_openai_vision(
    data: bytes,
    ext: str,
    original_name: str,
) -> dict[str, Any] | None:
    if not settings.openai_api_key or ext not in (".png", ".jpg", ".jpeg", ".webp"):
        return None

    try:
        b64_image = base64.b64encode(data).decode("utf-8")
        mime = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext.lstrip('.')}"
        data_uri = f"data:{mime};base64,{b64_image}"

        system_prompt = (
            "You are a clinical intake assistant extracting structured data from a medical document photo. "
            "Return a strictly valid JSON object matching the following structure without markdown wrapper:\n"
            "{\n"
            '  "patient": {"name": str, "age": str, "gender": str, "uhid": str},\n'
            '  "visit": {"visit_date": str, "department": str, "doctor": str},\n'
            '  "chiefComplaints": [{"complaint": str, "duration": str}],\n'
            '  "vitals": [{"name": str, "patientValue": str, "unit": str}],\n'
            '  "laboratoryResults": [{"testName": str, "patientValue": str, "referenceRange": str}],\n'
            '  "medications": [{"name": str, "dosage": str, "frequency": str, "duration": str}]\n'
            "}\n"
            "Extract ONLY what is explicitly visible. Never fabricate numbers or clinical observations."
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_document_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": f"Extract structured clinical data from {original_name}:"},
                                {"type": "image_url", "image_url": {"url": data_uri, "detail": "high"}},
                            ],
                        },
                    ],
                    "temperature": 0.0,
                    "response_format": {"type": "json_object"},
                    "store": False,
                },
            )

        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception as exc:
        print(f"[OpenAI Vision Adapter] Fallback triggered: {exc}")
        return None

    return None


# ---------------------------------------------------------
# Document OCR & Upload Route
# ---------------------------------------------------------

@router.post("/ocr")
async def ocr_document(
    file: UploadFile = File(...),
    consent_external_processing: bool = Form(default=False),
    encounter_id: str | None = Form(default=None),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    original_name = file.filename or "document"
    ext = _ext(original_name)

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported document type '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Stream file into memory with strict size bounds
    size = 0
    chunks = []
    while True:
        chunk = await file.read(64 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large; maximum supported size is {MAX_FILE_BYTES // (1024*1024)} MB.",
            )
        chunks.append(chunk)

    data = b"".join(chunks)

    # Validate Magic Bytes / File Signatures
    if not _validate_file_magic(data, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match declared extension '{ext}'. Upload rejected for clinical safety.",
        )

    stored_name = _safe_filename(original_name)
    stored_path = UPLOAD_DIR / stored_name
    registered = False

    try:
        stored_path.write_bytes(data)

        preview_url = f"/api/documents/{stored_name}/preview"
        download_url = f"/api/documents/{stored_name}/download"
        mime_type = _get_mime_type(ext)

        # Extraction candidate: OpenAI Vision vs Local Pipeline
        openai_structured = None
        extraction_provider = "local_pymupdf"
        pages: list[dict[str, Any]] = []
        text = ""
        truncation_warning = None

        if ext in (".txt", ".csv", ".md"):
            text = data.decode("utf-8", errors="replace")
            pages = [{"page": 1, "text": text, "confidence": "source_verified_text"}]
        elif ext == ".pdf":
            text, pages, total_pages = await asyncio.to_thread(_process_pdf, data, original_name)
            if total_pages > MAX_PDF_PAGES:
                truncation_warning = f"PDF contains {total_pages} pages; processed pages 1–{MAX_PDF_PAGES}. Additional pages were bounded for processing limits."
        else:
            # Strictly gate OpenAI Vision behind explicit consent
            if consent_external_processing and settings.openai_api_key:
                openai_structured = await _extract_with_openai_vision(data, ext, original_name)

            if openai_structured:
                extraction_provider = "openai_vision"
                text = f"[Structured extraction via OpenAI {settings.openai_document_model}]"
                pages = [{"page": 1, "text": text, "confidence": "openai_vision_structured"}]
            else:
                text, pages = await asyncio.to_thread(_ocr_image, data, original_name)

        # Process structured entities
        if openai_structured:
            structured = openai_structured
        else:
            structured = await asyncio.to_thread(extract_medical_document, text)

        # Default review status tags on all extracted entities
        for category in ("chiefComplaints", "vitals", "laboratoryResults", "medications", "diagnoses"):
            if category in structured and isinstance(structured[category], list):
                for item in structured[category]:
                    if isinstance(item, dict):
                        item.setdefault("reviewStatus", "DOCUMENT_EXTRACTED")
                        item.setdefault("verifiedBy", None)
                        item.setdefault("verifiedAt", None)

        # Attention items
        attention_items: list[dict[str, Any]] = []
        for item in structured.get("vitals", []):
            if item.get("attention"):
                attention_items.append({
                    "type": "Vital",
                    "name": item.get("name"),
                    "patientValue": item.get("patientValue"),
                    "referenceRange": item.get("reference_range") or item.get("referenceRange"),
                    "status": item.get("status"),
                    "comparison": item.get("comparison"),
                })

        for item in structured.get("laboratoryResults", []):
            if item.get("attention"):
                attention_items.append({
                    "type": "Laboratory",
                    "name": item.get("testName"),
                    "patientValue": item.get("patientValue"),
                    "referenceRange": item.get("referenceRange") or item.get("reference_range"),
                    "status": item.get("status"),
                    "comparison": item.get("comparison"),
                })

        # Persist document record into transactional database
        now = int(time.time())
        with transaction() as conn:
            conn.execute(
                """
                INSERT INTO documents (
                    stored_name, original_name, ext, mime_type,
                    owner_id, owner_role, encounter_id,
                    consent_external_processing, text_content,
                    pages_json, structured_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    stored_name,
                    original_name,
                    ext,
                    mime_type,
                    user["sub"],
                    user.get("role", "patient"),
                    encounter_id,
                    1 if consent_external_processing else 0,
                    text,
                    json.dumps(pages),
                    json.dumps(structured),
                    now,
                ),
            )

            if consent_external_processing:
                conn.execute(
                    """
                    INSERT INTO user_consents (user_id, consent_type, granted, timestamp)
                    VALUES (?, ?, ?, ?);
                    """,
                    (user["sub"], "external_ai_document_processing", 1, now),
                )
        registered = True
    finally:
        if not registered and stored_path.exists():
            try:
                stored_path.unlink()
            except Exception:
                pass

    return {
        "name": original_name,
        "type": ext.lstrip("."),
        "mimeType": mime_type,
        "processedAt": datetime.now(timezone.utc).isoformat(),
        "extractionStatus": "structured",
        "extractionProvider": extraction_provider,
        "truncationWarning": truncation_warning,
        "text": text,
        "pages": pages,
        "sourceDocument": {
            "originalName": original_name,
            "storedName": stored_name,
            "mimeType": mime_type,
            "url": preview_url,
            "previewUrl": preview_url,
            "downloadUrl": download_url,
        },
        "structuredData": structured,
        "attentionItems": attention_items,
    }


# ---------------------------------------------------------
# Document Corrections API (Audit Trail)
# ---------------------------------------------------------

class DocumentCorrectionRequest(BaseModel):
    field_key: str = Field(min_length=1)
    original_value: str = ""
    corrected_value: str = Field(min_length=1)
    reason: str = ""


@router.post("/{stored_name}/corrections")
def submit_document_correction(
    stored_name: str,
    req: DocumentCorrectionRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE stored_name = ?;", (stored_name,)).fetchone()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        # Authorization check: only owner, physician, or admin can submit corrections
        if user.get("role") not in ("doctor", "admin") and doc["owner_id"] != user["sub"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this document.")

    now = int(time.time())
    structured = json.loads(doc["structured_json"] or "{}")
    derived_orig = req.original_value

    # Update structured JSON with corrected value
    # Check vitals and laboratoryResults
    for cat in ("vitals", "laboratoryResults", "medications", "diagnoses", "chiefComplaints"):
        items = structured.get(cat, [])
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    name_key = item.get("name") or item.get("testName") or ""
                    if name_key == req.field_key or req.field_key.endswith(name_key):
                        if not derived_orig:
                            derived_orig = str(item.get("patientValue") or item.get("value") or "")
                        item["patientValue"] = req.corrected_value
                        item["reviewStatus"] = "CORRECTED"
                        item["verifiedBy"] = user["sub"]
                        item["verifiedAt"] = datetime.now(timezone.utc).isoformat()

    # Track effective corrections map in structured payload
    structured.setdefault("effectiveCorrections", {})[req.field_key] = {
        "original_value": derived_orig,
        "corrected_value": req.corrected_value,
        "author": user["sub"],
        "role": user.get("role", "patient"),
        "timestamp": now,
        "reason": req.reason,
    }

    with transaction() as conn:
        conn.execute(
            """
            INSERT INTO document_corrections (
                stored_name, field_key, original_value, corrected_value,
                author_id, author_role, timestamp, reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                stored_name,
                req.field_key,
                derived_orig,
                req.corrected_value,
                user["sub"],
                user.get("role", "patient"),
                now,
                req.reason,
            ),
        )

        conn.execute(
            "UPDATE documents SET structured_json = ? WHERE stored_name = ?;",
            (json.dumps(structured), stored_name),
        )

    return {
        "ok": True,
        "message": f"Correction for '{req.field_key}' recorded successfully.",
        "correction": {
            "field_key": req.field_key,
            "original_value": derived_orig,
            "corrected_value": req.corrected_value,
            "author": user["sub"],
            "role": user.get("role", "patient"),
            "timestamp": now,
            "reason": req.reason,
        },
        "effectiveStructuredData": structured,
    }


@router.get("/{stored_name}/corrections")
def get_document_corrections(
    stored_name: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    with get_db() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE stored_name = ?;", (stored_name,)).fetchone()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        if user.get("role") not in ("doctor", "admin") and doc["owner_id"] != user["sub"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this document.")

        rows = conn.execute(
            "SELECT * FROM document_corrections WHERE stored_name = ? ORDER BY timestamp ASC;",
            (stored_name,),
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------
# Authenticated Document Serving Routes
# ---------------------------------------------------------

@router.get("/{stored_name}/preview")
async def preview_document(
    stored_name: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> FileResponse:
    clean_name = os.path.basename(stored_name)

    # Require document DB record before serving any file
    with get_db() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE stored_name = ?;", (clean_name,)).fetchone()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or access expired.",
            )
        if user.get("role") not in ("doctor", "admin") and doc["owner_id"] != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this document.",
            )

    file_path = UPLOAD_DIR / clean_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found on server storage.",
        )

    ext = _ext(clean_name)
    media_type = _get_mime_type(ext)

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={"Content-Disposition": "inline"},
    )


@router.get("/{stored_name}/download")
async def download_document(
    stored_name: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> FileResponse:
    clean_name = os.path.basename(stored_name)

    # Require document DB record before serving any file
    with get_db() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE stored_name = ?;", (clean_name,)).fetchone()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or access expired.",
            )
        if user.get("role") not in ("doctor", "admin") and doc["owner_id"] != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this document.",
            )

    file_path = UPLOAD_DIR / clean_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found on server storage.",
        )

    ext = _ext(clean_name)
    media_type = _get_mime_type(ext)

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=clean_name,
    )