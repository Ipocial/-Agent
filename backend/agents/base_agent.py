"""Agent基类 - 定义所有Agent的统一接口和行为"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from config import LLMConfig
from models.schemas import AgentContext, AgentResult
from agents.llm_client import llm_client
from utils.helpers import extract_json_from_text


class BaseAgent(ABC):
    """Agent基类"""

    def __init__(
        self,
        name: str,
        description: str,
        system_prompt: str,
        llm_config: LLMConfig,
    ):
        self.name = name
        self.description = description
        self.system_prompt = system_prompt
        self.llm_config = llm_config
        self.llm = llm_client

    @abstractmethod
    def build_user_prompt(self, context: AgentContext) -> str:
        """构建用户提示词（子类实现）"""
        pass

    @abstractmethod
    def parse_result(self, raw_output: str, context: AgentContext) -> AgentResult:
        """解析LLM输出为结构化结果（子类实现）"""
        pass

    async def execute(self, context: AgentContext) -> AgentResult:
        """执行Agent任务"""
        try:
            # 构建消息
            user_prompt = self.build_user_prompt(context)
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": user_prompt},
            ]

            # 调用LLM
            raw_output = await self.llm.chat(
                messages=messages,
                config=self.llm_config,
                response_format="json",
            )

            # 解析结果
            result = self.parse_result(raw_output, context)
            result.success = True
            return result

        except Exception as e:
            return AgentResult(
                agent_name=self.name,
                analysis_text=f"Agent执行失败: {str(e)}",
                structured_data={},
                confidence=0.0,
                success=False,
                error=str(e),
            )

    def validate_output(self, result: AgentResult) -> bool:
        """验证输出是否符合预期"""
        if not result.success:
            return False
        if not result.structured_data:
            return False
        if result.confidence <= 0:
            return False
        return True
