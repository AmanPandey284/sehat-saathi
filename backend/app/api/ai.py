from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import httpx

from app.core.config import settings
from app.core.auth import security, verify_token

router = APIRouter(prefix="/ai", tags=["ai"])


class SummaryRequest(BaseModel):
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    history: dict[str, Any] = Field(default_factory=dict)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    complaint: dict[str, Any] | None = None
    consent_obtained: bool = Field(default=True, description="Patient consent for AI summarization processing")


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
async def create_summary(req: SummaryRequest) -> dict[str, Any]:
    api_key = settings.openai_api_key
    model = settings.openai_text_model

    # If no key configured, return deterministic summary with honest provider label
    if not api_key:
        return {
            "summary": deterministic_summary(req),
            "provider": "deterministic-evidence-template",
            "model": "rule-based-local",
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
                    # Request zero retention where permitted by API tier
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
                    "fallback_used": False,
                }

        # If API returned non-200 or empty choices
        return {
            "summary": deterministic_summary(req),
            "provider": "deterministic-fallback",
            "model": "rule-based-local",
            "fallback_used": True,
            "error_detail": f"OpenAI HTTP status {resp.status_code}",
        }

    except Exception as exc:
        return {
            "summary": deterministic_summary(req),
            "provider": "deterministic-fallback",
            "model": "rule-based-local",
            "fallback_used": True,
            "error_detail": str(exc),
        }
