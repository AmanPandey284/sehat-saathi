from __future__ import annotations

import json
import os
import urllib.request
from typing import Any

from dotenv import load_dotenv
load_dotenv()

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/ai", tags=["ai"])

class SummaryRequest(BaseModel):
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    history: dict[str, Any] = Field(default_factory=dict)
    documents: list[dict[str, Any]] = Field(default_factory=list)
    complaint: dict[str, Any] | None = None


def deterministic_summary(req: SummaryRequest) -> str:
    complaint = req.complaint or {}
    lines = [f"Chief complaint: {complaint.get('displayName', 'Not reported')}", "", "History of present illness:"]
    if req.history:
        for k, v in req.history.items():
            lines.append(f"• {k}: {v if v not in (None, '', []) else 'Not reported'}")
    else:
        lines.append("• Not reported")
    if req.documents:
        lines += ["", "Prior records:"]
        for doc in req.documents:
            lines.append(f"• {doc.get('name', 'Document')}: {len(doc.get('entities', []))} extracted item(s)")
    lines += ["", "Safety note: this is a draft for physician verification, not a diagnosis or treatment recommendation."]
    return "\n".join(lines)

@router.post("/summary")
def create_summary(req: SummaryRequest) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    if not api_key:
        return {"summary": deterministic_summary(req), "provider": "deterministic-evidence-template"}
    prompt = (
        "Create a concise physician-ready clinical intake summary using ONLY the supplied evidence. "
        "Do not diagnose, infer missing facts, or recommend treatment. Mark missing information as Not reported. "
        "Preserve important source distinctions.\n\n" + json.dumps(req.model_dump(), ensure_ascii=False)
    )
    payload = json.dumps({"model": model, "input": prompt}).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            data = json.loads(response.read().decode("utf-8"))
        text = data.get("output_text") or deterministic_summary(req)
        return {"summary": text, "provider": model}
    except Exception:
        return {"summary": deterministic_summary(req), "provider": "deterministic-fallback"}
