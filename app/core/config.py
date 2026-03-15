"""
核心配置
"""
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # 数据库 - 默认使用 SQLite（开发环境）
    database_url: str = "sqlite:///./test_platform.db"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24小时
    
    # Ollama AI
    ollama_base_url: str = "http://192.168.118.138:11434"
    ollama_model: str = "qwen3:8b"
    
    class Config:
        env_file = ".env"

settings = Settings()
