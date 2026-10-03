from __future__ import annotations

from typing import Any
from fastapi import APIRouter

from app.core.auth import list_approved_doctors

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("")
def get_approved_doctors() -> list[dict[str, Any]]:
    """
    Returns verified, approved physician directory from durable accounts store.
    """
    return list_approved_doctors()
