from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Bangla AudioBook - TTS Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # Model Configurations
    BANGLA_MODEL_REPO: str = "EMTIAZZ/bangladeshi-bangla-tts-vits"
    XTTS_MODEL_NAME: str = "tts_models/multilingual/multi-dataset/xtts_v2"
    USE_CUDA: bool = False
    
    # Platform API Callback
    PLATFORM_API_URL: str = "http://localhost:8000/api/v1"
    
    # Storage / Output directory
    OUTPUT_DIR: str = "output"
    
    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
