"""
Health check endpoint.

This is deliberately the very first API route in the project: it lets the
frontend (and, later, deployment tooling / load balancers) verify the
backend is up without touching any real business logic or the database.
"""

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def get_health() -> dict:
    return {
        "status": "ok",
        "service": "medikiosk-backend",
        "version": "0.1.0",
        "environment": settings.environment,
    }
