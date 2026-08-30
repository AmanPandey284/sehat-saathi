from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    app_name: str = 'MediKiosk'
    environment: str = 'development'
    frontend_origin: str = 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    @property
    def allowed_origins(self) -> list[str]: return [x.strip() for x in self.frontend_origin.split(',') if x.strip()]
settings=Settings()
