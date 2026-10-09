import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "CertiFlow API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/certiflow.db"
    
    # Storage
    STORAGE_DIR: Path = BASE_DIR / "storage"
    CERTIFICATES_DIR: Path = BASE_DIR / "storage" / "certificates"
    ZIPS_DIR: Path = BASE_DIR / "storage" / "zips"
    
    # Processing limits
    MAX_RECIPIENTS_PER_JOB: int = 500
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()

# Ensure storage directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.CERTIFICATES_DIR.mkdir(parents=True, exist_ok=True)
settings.ZIPS_DIR.mkdir(parents=True, exist_ok=True)
