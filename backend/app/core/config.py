from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sehat Saathi"
    environment: str = "development"
    frontend_origin: str = (
        "http://localhost:5173,http://localhost:5174,http://localhost:4173,"
        "http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:4173,"
        "https://sehat-saathi-09.vercel.app"
    )

    # Auth & Tokens
    auth_secret_key: str = "sehat-saathi-hmac-auth-secret-key-sih-2026"
    access_token_expire_minutes: int = 120
    otp_expire_seconds: int = 300  # 5 minutes
    otp_cooldown_seconds: int = 60  # 60s cooldown
    otp_max_attempts: int = 5

    # Document Extraction & AI Models
    openai_api_key: str | None = None
    openai_document_model: str = "gpt-4o-mini"
    openai_text_model: str = "gpt-4o-mini"
    openai_transcription_model: str = "gpt-4o-mini-transcribe"

    # Resend Email Delivery Adapter
    resend_api_key: str | None = None
    resend_from_email: str = "onboarding@resend.dev"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [x.strip() for x in self.frontend_origin.split(",") if x.strip()]


settings = Settings()
