from __future__ import annotations

import io
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.staticfiles import StaticFiles

from ..core.medical_extractor import (
    extract_medical_document,
)

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

MAX_FILE_BYTES = 8 * 1024 * 1024

UPLOAD_DIR = (
    Path(__file__).resolve().parents[2]
    / "uploads"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


def _ext(name: str) -> str:
    return os.path.splitext(
        name.lower()
    )[1]


def _safe_filename(name: str) -> str:
    ext = _ext(name)

    return (
        uuid.uuid4().hex
        + ext
    )


def _ocr_image(
    data: bytes,
    filename: str,
) -> tuple[
    str,
    list[dict[str, Any]],
]:
    try:
        import pytesseract

        from PIL import (
            Image,
            ImageEnhance,
            ImageFilter,
            ImageOps,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "OCR dependencies unavailable: "
                f"{exc}"
            ),
        )

    try:
        image = Image.open(
            io.BytesIO(data)
        )

        image = ImageOps.exif_transpose(
            image
        ).convert("RGB")

        # Preserve enough resolution for small
        # prescription/laboratory text.
        if max(image.size) < 2400:
            scale = (
                2400 / max(image.size)
            )

            image = image.resize(
                (
                    int(
                        image.width
                        * scale
                    ),
                    int(
                        image.height
                        * scale
                    ),
                )
            )

        image = ImageEnhance.Contrast(
            image
        ).enhance(1.15)

        image = ImageEnhance.Sharpness(
            image
        ).enhance(1.25)

        image = image.filter(
            ImageFilter.SHARPEN
        )

        try:
            text = pytesseract.image_to_string(
                image,
                lang="eng+hin",
                config="--psm 6",
            )
        except Exception:
            text = pytesseract.image_to_string(
                image,
                lang="eng",
                config="--psm 6",
            )

        return text.strip(), [
            {
                "page": 1,
                "text": text.strip(),
                "confidence": "medium",
            }
        ]

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not OCR {filename}: "
                f"{exc}"
            ),
        )


def _process_pdf(
    data: bytes,
    filename: str,
) -> tuple[
    str,
    list[dict[str, Any]],
]:
    try:
        import fitz
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "PDF support unavailable: "
                f"{exc}"
            ),
        )

    try:
        doc = fitz.open(
            stream=data,
            filetype="pdf",
        )

        pages = []
        all_text = []

        for idx, page in enumerate(doc):
            text = page.get_text(
                "text"
            ).strip()

            if not text:
                pix = page.get_pixmap(
                    matrix=fitz.Matrix(
                        2.0,
                        2.0,
                    ),
                    alpha=False,
                )

                text, _ = _ocr_image(
                    pix.tobytes("png"),
                    (
                        f"{filename}-page-"
                        f"{idx + 1}.png"
                    ),
                )

            pages.append(
                {
                    "page": idx + 1,
                    "text": text,
                    "confidence": "medium",
                }
            )

            if text:
                all_text.append(text)

        return (
            "\n\n".join(all_text),
            pages,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not process PDF "
                f"{filename}: {exc}"
            ),
        )


@router.post("/ocr")
async def ocr_document(
    file: UploadFile = File(...),
) -> dict[str, Any]:
    original_name = (
        file.filename or "document"
    )

    ext = _ext(original_name)

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported document type",
        )

    data = await file.read()

    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                "File too large; maximum "
                "is 8 MB"
            ),
        )

    # ---------------------------------------------------------
    # Save original document.
    #
    # This is important because the physician must be able
    # to open the exact image/PDF used for extraction.
    # ---------------------------------------------------------

    stored_name = _safe_filename(
        original_name
    )

    stored_path = (
        UPLOAD_DIR / stored_name
    )

    stored_path.write_bytes(data)

    file_url = (
        f"/uploads/{stored_name}"
    )

    # ---------------------------------------------------------
    # OCR
    # ---------------------------------------------------------

    if ext in {
        ".txt",
        ".csv",
        ".md",
    }:
        text = data.decode(
            "utf-8",
            errors="replace",
        )

        pages = [
            {
                "page": 1,
                "text": text,
                "confidence": "high",
            }
        ]

    elif ext == ".pdf":
        text, pages = _process_pdf(
            data,
            original_name,
        )

    else:
        text, pages = _ocr_image(
            data,
            original_name,
        )

    # ---------------------------------------------------------
    # STRUCTURED MEDICAL EXTRACTION
    # ---------------------------------------------------------

    structured = extract_medical_document(
        text
    )

    # ---------------------------------------------------------
    # Doctor attention summary
    # ---------------------------------------------------------

    attention_items = []

    for item in structured.get(
        "vitals",
        [],
    ):
        if item.get("attention"):
            attention_items.append(
                {
                    "type": "Vital",
                    "name": item.get(
                        "name"
                    ),
                    "patientValue": item.get(
                        "patientValue"
                    ),
                    "referenceRange": item.get(
                        "reference_range"
                    ),
                    "status": item.get(
                        "status"
                    ),
                    "comparison": item.get(
                        "comparison"
                    ),
                }
            )

    for item in structured.get(
        "laboratoryResults",
        [],
    ):
        if item.get("attention"):
            attention_items.append(
                {
                    "type": "Laboratory",
                    "name": item.get(
                        "testName"
                    ),
                    "patientValue": item.get(
                        "patientValue"
                    ),
                    "referenceRange": item.get(
                        "referenceRange"
                    ),
                    "status": item.get(
                        "status"
                    ),
                    "comparison": item.get(
                        "comparison"
                    ),
                }
            )

    return {
        "name": original_name,
        "type": ext.lstrip("."),
        "processedAt": datetime.now(
            timezone.utc
        ).isoformat(),

        "extractionStatus": (
            "structured"
        ),

        "text": text,

        "pages": pages,

        # Original source document
        "sourceDocument": {
            "originalName": original_name,
            "storedName": stored_name,
            "url": file_url,
        },

        # Full medical record
        "structuredData": structured,

        # Things requiring doctor review
        "attentionItems": attention_items,
    }