from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MediKiosk"
    environment: str = "development"

    frontend_origin: str = (
        "http://localhost:5173,"
        "http://localhost:5174,"
        "http://127.0.0.1:5173,"
        "http://127.0.0.1:5174,"
        "https://sehat-saathi-09.vercel.app"
    )

    # Authentication settings
    jwt_secret_key: str = "CHANGE_THIS_SECRET_IN_ENV"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [
            x.strip()
            for x in self.frontend_origin.split(",")
            if x.strip()
        ]


settings = Settings()