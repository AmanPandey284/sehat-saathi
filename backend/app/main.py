"""MediKiosk backend API."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, documents, ai
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="MediKiosk prototype API for structured clinical intake and physician review.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(ai.router, prefix="/api")

@app.get("/")
def root() -> dict[str, str]:
    return {"message": "MediKiosk API. See /docs for available endpoints."}
