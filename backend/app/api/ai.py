from __future__ import annotations

import io
import json
import time
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
import httpx

from app.core.config import settings
from app.core.auth import get_current_user
from app.core.db import transaction

router = APIRouter(prefix="/ai", tags=["ai"])


class SummaryRequest(BaseModel):
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    history: dict[str, Any] = Field(default_factory=dict)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    complaint: dict[str, Any] | None = None
    consent_obtained: bool = Field(default=False, description="Patient consent for external AI processing (strictly False by default)")


def deterministic_summary(req: SummaryRequest) -> str:
    complaint = req.complaint or {}
    lines = [
        f"Chief complaint: {complaint.get('displayName', 'Not reported')}",
        "",
        "History of present illness:",
    ]
    if req.history:
        for k, v in req.history.items():
            lines.append(f"• {k}: {v if v not in (None, '', []) else 'Not reported'}")
    else:
        lines.append("• Not reported")

    if req.documents:
        lines += ["", "Prior records:"]
        for doc in req.documents:
            lines.append(f"• {doc.get('name', 'Document')}: {len(doc.get('entities', []))} extracted item(s)")

    lines += [
        "",
        "Clinical Notice: Structured clinical draft for physician verification only. Not an autonomous diagnosis or treatment prescription.",
    ]
    return "\n".join(lines)


@router.post("/summary")
@router.post("/summarize")
async def create_summary(
    req: SummaryRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    api_key = settings.openai_api_key
    model = settings.openai_text_model

    # Privacy gate: strictly require explicit external processing consent
    if not req.consent_obtained:
        return {
            "summary": deterministic_summary(req),
            "provider": "deterministic-evidence-template",
            "model": "rule-based-local",
            "consent_applied": False,
            "fallback_used": True,
            "fallback_reason": "External AI processing consent not granted; local deterministic clinical template used.",
        }

    now = int(time.time())
    with transaction() as conn:
        conn.execute(
            """
            INSERT INTO user_consents (user_id, consent_type, granted, timestamp)
            VALUES (?, ?, ?, ?);
            """,
            (user["sub"], "external_ai_summarization", 1, now),
        )

    # If no external API key configured, use deterministic template
    if not api_key:
        return {
            "summary": deterministic_summary(req),
            "provider": "deterministic-evidence-template",
            "model": "rule-based-local",
            "consent_applied": True,
            "fallback_used": False,
        }

    prompt = (
        "You are an assistant to a physician reviewing a patient intake. "
        "Create a concise, objective clinical intake summary using ONLY the supplied structured evidence below. "
        "Do not diagnose, invent unmentioned findings, or recommend treatments. "
        "Mark missing information as 'Not reported'. Maintain strict clinical neutrality.\n\n"
        + json.dumps(req.model_dump(), ensure_ascii=False)
    )

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a clinical decision-support summarizer for licensed physicians."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.1,
                    "store": False,
                },
            )

        if resp.status_code == 200:
            data = resp.json()
            choices = data.get("choices", [])
            if choices and choices[0].get("message", {}).get("content"):
                text = choices[0]["message"]["content"].strip()
                return {
                    "summary": text,
                    "provider": "openai",
                    "model": model,
                    "consent_applied": True,
                    "fallback_used": False,
                }
    except Exception as exc:
        print(f"[AI summary fallback] {exc}")

    return {
        "summary": deterministic_summary(req),
        "provider": "deterministic-fallback",
        "model": "rule-based-local",
        "consent_applied": True,
        "fallback_used": True,
        "fallback_reason": "External AI provider unavailable; defaulted to local clinical template.",
    }


@router.post("/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    consent_obtained: bool = Form(default=False),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Authenticated, consent-gated audio transcription endpoint.
    If external consent is not granted or external provider is unavailable,
    returns empty transcript with failure notice. NEVER injects canned symptoms.
    """
    if not consent_obtained:
        return {
            "ok": False,
            "transcript": "",
            "error": "External AI transcription consent not granted. Please dictate with speech recognition or type symptoms manually.",
        }

    if not settings.openai_api_key:
        return {
            "ok": False,
            "transcript": "",
            "error": "Automated voice transcription service unconfigured. Please type your symptoms manually.",
        }

    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file exceeds 25 MB limit.",
        )

    try:
        files = {
            "file": (file.filename or "recording.webm", audio_bytes, file.content_type or "audio/webm"),
        }
        data = {
            "model": settings.openai_transcription_model,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                },
                files=files,
                data=data,
            )

        if resp.status_code == 200:
            result = resp.json()
            transcript_text = result.get("text", "").strip()
            return {
                "ok": True,
                "transcript": transcript_text,
                "provider": "openai_whisper",
            }
        else:
            return {
                "ok": False,
                "transcript": "",
                "error": f"Transcription provider error ({resp.status_code}). Please enter symptoms manually.",
            }
    except Exception as exc:
        print(f"[Transcription error] {exc}")
        return {
            "ok": False,
            "transcript": "",
            "error": "Transcription connection failed. Please enter symptoms manually.",
        }
