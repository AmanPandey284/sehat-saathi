from __future__ import annotations

import asyncio
import base64
import io
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
    Depends,
    status,
)
from fastapi.responses import FileResponse
import httpx

from app.core.config import settings
from app.core.auth import security, verify_token
from app.core.medical_extractor import extract_medical_document


router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)


# ---------------------------------------------------------
# File configuration & Safety Bounds
# ---------------------------------------------------------

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

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


def _ext(name: str) -> str:
    return os.path.splitext(name.lower())[1]


def _safe_filename(name: str) -> str:
    ext = _ext(name)
    return f"{uuid.uuid4().hex}{ext}"


def _validate_file_magic(data: bytes, ext: str) -> bool:
    """Validate file signatures against spoofed extension names."""
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


def _build_tesseract_lang() -> str:
    """Returns 'eng' for printed clinical documents to ensure bounded memory and zero latency spikes."""
    return "eng"


_TESSERACT_LANG: str = _build_tesseract_lang()


# ---------------------------------------------------------
# Local OCR Workers (PyMuPDF + Tesseract)
# ---------------------------------------------------------

def _ocr_image(
    data: bytes,
    filename: str,
) -> tuple[str, list[dict[str, Any]]]:
    try:
        import pytesseract
        from PIL import Image, ImageOps
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"OCR dependencies unavailable: {exc}",
        )

    try:
        image = Image.open(io.BytesIO(data))
        image = ImageOps.exif_transpose(image).convert("RGB")

        max_dimension = 1400
        if max(image.size) > max_dimension:
            scale = max_dimension / max(image.size)
            image = image.resize(
                (max(1, int(image.width * scale)), max(1, int(image.height * scale)))
            )

        os.environ["OMP_THREAD_LIMIT"] = "1"
        config = "--oem 3 --psm 3 -c preserve_interword_spaces=1"

        try:
            text = pytesseract.image_to_string(
                image,
                lang=_TESSERACT_LANG,
                config=config,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"OCR processing failed for {filename}: {exc}",
            )

        text = text.strip()
        if not text:
            raise HTTPException(
                status_code=422,
                detail="OCR completed but no readable text was detected in the document.",
            )

        # Honest uncalibrated heuristic
        words = text.split()
        alpha_words = sum(1 for w in words if any(c.isalnum() for c in w))
        heuristic_score = min(1.0, alpha_words / max(1, len(words)))

        return (
            text,
            [
                {
                    "page": 1,
                    "text": text,
                    "confidence": "uncalibrated_heuristic",
                    "signal_quality_score": round(heuristic_score, 2),
                }
            ],
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not OCR {filename}: {exc}",
        )


def _process_pdf(
    data: bytes,
    filename: str,
) -> tuple[str, list[dict[str, Any]]]:
    try:
        import fitz
        from PIL import Image
        import pytesseract
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"PDF/OCR support unavailable: {exc}",
        )

    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Corrupt or unreadable PDF: {exc}")

    pages: list[dict[str, Any]] = []
    total_pages = min(len(doc), MAX_PDF_PAGES)
    all_text: list[str] = []

    for i in range(total_pages):
        page = doc[i]
        page_num = i + 1
        page_text = page.get_text("text").strip()

        if page_text and len(page_text) >= 40:
            # Native digital extraction
            pages.append({
                "page": page_num,
                "text": page_text,
                "source": "native_digital_pdf",
                "confidence": "digital_source_verified",
            })
            all_text.append(page_text)
        else:
            # Scanned page rasterization
            try:
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
                os.environ["OMP_THREAD_LIMIT"] = "1"
                scanned_text = pytesseract.image_to_string(
                    img,
                    lang=_TESSERACT_LANG,
                    config="--oem 3 --psm 3",
                ).strip()

                pages.append({
                    "page": page_num,
                    "text": scanned_text or "[Unreadable or blank scanned page]",
                    "source": "scanned_raster_ocr",
                    "confidence": "uncalibrated_heuristic",
                })
                if scanned_text:
                    all_text.append(scanned_text)
            except Exception as e:
                pages.append({
                    "page": page_num,
                    "text": f"[Page rasterization failed: {e}]",
                    "source": "raster_failed",
                    "confidence": "error",
                })

    doc.close()
    combined_text = "\n\n".join(all_text).strip()
    return combined_text, pages


# ---------------------------------------------------------
# OpenAI Vision Extraction Candidate
# ---------------------------------------------------------

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
) -> dict[str, Any]:
    original_name = file.filename or "document"
    ext = _ext(original_name)

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported document type '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    data = await file.read()
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large; maximum supported size is {MAX_FILE_BYTES // (1024*1024)} MB.",
        )

    # Validate Magic Bytes / File Signatures
    if not _validate_file_magic(data, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match declared extension '{ext}'. Upload rejected for clinical safety.",
        )

    stored_name = _safe_filename(original_name)
    stored_path = UPLOAD_DIR / stored_name
    stored_path.write_bytes(data)

    preview_url = f"/api/documents/{stored_name}/preview"
    download_url = f"/api/documents/{stored_name}/download"

    # Extraction candidate: OpenAI Vision vs Local Pipeline
    openai_structured = None
    extraction_provider = "local_pymupdf"
    pages: list[dict[str, Any]] = []
    text = ""

    if ext in (".txt", ".csv", ".md"):
        text = data.decode("utf-8", errors="replace")
        pages = [{"page": 1, "text": text, "confidence": "source_verified_text"}]
    elif ext == ".pdf":
        text, pages = await asyncio.to_thread(_process_pdf, data, original_name)
    else:
        # Check OpenAI Vision candidate if configured
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

    return {
        "name": original_name,
        "type": ext.lstrip("."),
        "processedAt": datetime.now(timezone.utc).isoformat(),
        "extractionStatus": "structured",
        "extractionProvider": extraction_provider,
        "text": text,
        "pages": pages,
        "sourceDocument": {
            "originalName": original_name,
            "storedName": stored_name,
            "url": preview_url,
            "previewUrl": preview_url,
            "downloadUrl": download_url,
        },
        "structuredData": structured,
        "attentionItems": attention_items,
    }


# ---------------------------------------------------------
# Private Document Serving Routes
# ---------------------------------------------------------

@router.get("/{stored_name}/preview")
async def preview_document(stored_name: str) -> FileResponse:
    # Security: sanitize filename to prevent directory traversal
    clean_name = os.path.basename(stored_name)
    file_path = UPLOAD_DIR / clean_name

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access expired.",
        )

    ext = _ext(clean_name)
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
    media_type = mime_map.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={"Content-Disposition": "inline"},
    )


@router.get("/{stored_name}/download")
async def download_document(stored_name: str) -> FileResponse:
    clean_name = os.path.basename(stored_name)
    file_path = UPLOAD_DIR / clean_name

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access expired.",
        )

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=clean_name,
    )