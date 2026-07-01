"""应用配置管理"""
import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class LLMConfig(BaseModel):
    """LLM模型配置"""
    provider: str = "openai"  # openai / anthropic / dashscope
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 4096


class Settings:
    """全局配置"""
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    # Anthropic
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    # 阿里通义千问 (DashScope)
    DASHSCOPE_API_KEY: str = os.getenv("DASHSCOPE_API_KEY", "")

    # 默认模型配置
    DEFAULT_LLM_CONFIG: LLMConfig = LLMConfig()

    # 各Agent独立模型配置（可选覆盖）
    DATA_AGENT_LLM: LLMConfig = LLMConfig(provider="openai", model="gpt-4o")
    NEWS_AGENT_LLM: LLMConfig = LLMConfig(provider="openai", model="gpt-4o-mini")
    RISK_AGENT_LLM: LLMConfig = LLMConfig(provider="openai", model="gpt-4o")
    DECISION_AGENT_LLM: LLMConfig = LLMConfig(provider="openai", model="gpt-4o")

    # 服务配置
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
