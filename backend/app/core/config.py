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
    otp_hmac_secret: str = ""
    otp_simulation_allowed: bool = False
    access_token_expire_minutes: int = 120
    otp_expire_seconds: int = 300  # 5 minutes
    otp_cooldown_seconds: int = 60  # 60s cooldown
    otp_max_attempts: int = 5
    data_dir: str = "data"

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
    def is_production(self) -> bool:
        return self.environment.strip().lower() in ("production", "prod")

    @property
    def is_simulation_permitted(self) -> bool:
        if self.is_production:
            return False
        # Permitted in non-production if explicitly allowed or in development mode
        return self.otp_simulation_allowed or self.environment.strip().lower() in ("development", "dev", "test", "testing")

    @property
    def effective_otp_secret(self) -> str:
        if self.otp_hmac_secret:
            return self.otp_hmac_secret
        import hashlib
        return hashlib.sha256((self.auth_secret_key + ":otp_secret_seed").encode("utf-8")).hexdigest()

    @property
    def allowed_origins(self) -> list[str]:
        return [x.strip() for x in self.frontend_origin.split(",") if x.strip()]


settings = Settings()

# Enforce secure configuration at startup in production
if settings.is_production:
    if settings.auth_secret_key == "sehat-saathi-hmac-auth-secret-key-sih-2026" or len(settings.auth_secret_key) < 32:
        raise ValueError("CRITICAL: Strong non-default AUTH_SECRET_KEY (>=32 chars) must be configured in production!")

