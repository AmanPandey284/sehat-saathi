from __future__ import annotations

import asyncio
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

from ..core.medical_extractor import (
    extract_medical_document,
)


router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)


# ---------------------------------------------------------
# File configuration
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

MAX_FILE_BYTES = 8 * 1024 * 1024


UPLOAD_DIR = (
    Path(__file__).resolve().parents[2]
    / "uploads"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# IMAGE OCR
#
# Important:
# - No artificial OCR timer.
# - OCR runs inside a worker thread.
# - Large images are resized before OCR.
# - Hindi is used only when installed.
# ---------------------------------------------------------

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
        print(
            f"[OCR] Starting image OCR: "
            f"{filename}"
        )

        # -------------------------------------------------
        # Open image
        # -------------------------------------------------

        image = Image.open(
            io.BytesIO(data)
        )

        image = ImageOps.exif_transpose(
            image
        ).convert("RGB")

        print(
            f"[OCR] Original image size: "
            f"{image.width}x{image.height}"
        )

        # -------------------------------------------------
        # Resize large camera/WhatsApp images.
        #
        # This keeps OCR practical on Render while
        # preserving enough resolution for medical text.
        # -------------------------------------------------

        max_dimension = 1800

        if max(image.size) > max_dimension:
            scale = (
                max_dimension
                / max(image.size)
            )

            image = image.resize(
                (
                    max(
                        1,
                        int(
                            image.width
                            * scale
                        ),
                    ),
                    max(
                        1,
                        int(
                            image.height
                            * scale
                        ),
                    ),
                )
            )

        print(
            f"[OCR] OCR image size: "
            f"{image.width}x{image.height}"
        )

        # -------------------------------------------------
        # Detect installed Tesseract languages.
        # -------------------------------------------------

        try:
            available_languages = set(
                pytesseract.get_languages(
                    config=""
                )
            )
        except Exception:
            available_languages = {
                "eng"
            }

        if {
            "eng",
            "hin",
        }.issubset(
            available_languages
        ):
            language = "eng+hin"
        else:
            language = "eng"

        print(
            f"[OCR] Using Tesseract language: "
            f"{language}"
        )

        # -------------------------------------------------
        # Document-oriented OCR.
        #
        # PSM 11 is suitable for reports containing
        # multiple text blocks and table-like regions.
        # -------------------------------------------------

        config = (
            "--oem 3 "
            "--psm 11 "
            "-c preserve_interword_spaces=1"
        )

        # -------------------------------------------------
        # OCR
        #
        # NO timeout is intentionally specified.
        # -------------------------------------------------

        try:
            text = pytesseract.image_to_string(
                image,
                lang=language,
                config=config,
            )

        except Exception as exc:
            print(
                f"[OCR] Tesseract failed for "
                f"{filename}: {exc}"
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    f"OCR failed for {filename}: "
                    f"{exc}"
                ),
            )

        text = text.strip()

        print(
            f"[OCR] Finished {filename}; "
            f"characters extracted: "
            f"{len(text)}"
        )

        if not text:
            raise HTTPException(
                status_code=422,
                detail=(
                    "OCR completed but no readable "
                    "text was detected in the document."
                ),
            )

        return (
            text,
            [
                {
                    "page": 1,
                    "text": text,
                    "confidence": "medium",
                }
            ],
        )

    except HTTPException:
        raise

    except Exception as exc:
        print(
            f"[OCR] Failed for {filename}: "
            f"{exc}"
        )

        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not OCR {filename}: "
                f"{exc}"
            ),
        )


# ---------------------------------------------------------
# PDF PROCESSING
# ---------------------------------------------------------

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
        print(
            f"[OCR] Opening PDF: "
            f"{filename}"
        )

        doc = fitz.open(
            stream=data,
            filetype="pdf",
        )

        pages: list[
            dict[str, Any]
        ] = []

        all_text: list[str] = []

        # -------------------------------------------------
        # Process every PDF page.
        # -------------------------------------------------

        for idx, page in enumerate(doc):
            print(
                f"[OCR] Processing PDF page "
                f"{idx + 1}/{len(doc)}"
            )

            # First try native PDF text extraction.
            text = page.get_text(
                "text"
            ).strip()

            # If the page is scanned, render it and OCR it.
            if not text:
                print(
                    f"[OCR] No embedded text on "
                    f"page {idx + 1}; using image OCR"
                )

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
                all_text.append(
                    text
                )

        doc.close()

        return (
            "\n\n".join(all_text),
            pages,
        )

    except HTTPException:
        raise

    except Exception as exc:
        print(
            f"[OCR] PDF processing failed for "
            f"{filename}: {exc}"
        )

        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not process PDF "
                f"{filename}: {exc}"
            ),
        )


# ---------------------------------------------------------
# OCR ENDPOINT
# ---------------------------------------------------------

@router.post("/ocr")
async def ocr_document(
    file: UploadFile = File(...),
) -> dict[str, Any]:

    # -----------------------------------------------------
    # Basic file validation
    # -----------------------------------------------------

    original_name = (
        file.filename or "document"
    )

    ext = _ext(
        original_name
    )

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported document type"
            ),
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

    # -----------------------------------------------------
    # Save original document.
    #
    # This allows the physician to open the exact
    # source file used for extraction.
    # -----------------------------------------------------

    stored_name = _safe_filename(
        original_name
    )

    stored_path = (
        UPLOAD_DIR
        / stored_name
    )

    stored_path.write_bytes(
        data
    )

    file_url = (
        f"/uploads/{stored_name}"
    )

    print(
        f"[OCR] Saved original document: "
        f"{original_name}"
    )

    # -----------------------------------------------------
    # Extract text
    # -----------------------------------------------------

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

        print(
            f"[OCR] Sending PDF to worker: "
            f"{original_name}"
        )

        text, pages = (
            await asyncio.to_thread(
                _process_pdf,
                data,
                original_name,
            )
        )

    else:

        print(
            f"[OCR] Sending image to worker: "
            f"{original_name}"
        )

        text, pages = (
            await asyncio.to_thread(
                _ocr_image,
                data,
                original_name,
            )
        )

    # -----------------------------------------------------
    # Structured medical extraction
    # -----------------------------------------------------

    print(
        "[OCR] Starting medical structuring"
    )

    structured = (
        await asyncio.to_thread(
            extract_medical_document,
            text,
        )
    )

    print(
        "[OCR] Medical structuring finished"
    )

    # -----------------------------------------------------
    # Doctor attention summary
    # -----------------------------------------------------

    attention_items: list[
        dict[str, Any]
    ] = []

    # -----------------------------------------------------
    # Vital attention items
    # -----------------------------------------------------

    for item in structured.get(
        "vitals",
        [],
    ):

        if item.get(
            "attention"
        ):

            attention_items.append(
                {
                    "type": "Vital",
                    "name": item.get(
                        "name"
                    ),
                    "patientValue": item.get(
                        "patientValue"
                    ),
                    "referenceRange": (
                        item.get(
                            "reference_range"
                        )
                    ),
                    "status": item.get(
                        "status"
                    ),
                    "comparison": item.get(
                        "comparison"
                    ),
                }
            )

    # -----------------------------------------------------
    # Laboratory attention items
    # -----------------------------------------------------

    for item in structured.get(
        "laboratoryResults",
        [],
    ):

        if item.get(
            "attention"
        ):

            attention_items.append(
                {
                    "type": "Laboratory",
                    "name": item.get(
                        "testName"
                    ),
                    "patientValue": item.get(
                        "patientValue"
                    ),
                    "referenceRange": (
                        item.get(
                            "referenceRange"
                        )
                    ),
                    "status": item.get(
                        "status"
                    ),
                    "comparison": item.get(
                        "comparison"
                    ),
                }
            )

    # -----------------------------------------------------
    # Final response
    # -----------------------------------------------------

    return {
        "name": original_name,

        "type": ext.lstrip(
            "."
        ),

        "processedAt": (
            datetime.now(
                timezone.utc
            ).isoformat()
        ),

        "extractionStatus": (
            "structured"
        ),

        # Full OCR text
        "text": text,

        # OCR pages
        "pages": pages,

        # Original source document
        "sourceDocument": {
            "originalName": original_name,
            "storedName": stored_name,
            "url": file_url,
        },

        # Structured medical information
        "structuredData": structured,

        # Values requiring physician attention
        "attentionItems": attention_items,
    }