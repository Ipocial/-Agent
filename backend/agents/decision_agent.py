"""决策Agent - 综合各SubAgent结果给出最终投资建议"""
import json

from config import settings
from models.schemas import AgentContext, AgentResult
from agents.base_agent import BaseAgent
from agents.prompts.decision import DECISION_SYSTEM_PROMPT, DECISION_USER_TEMPLATE
from utils.helpers import extract_json_from_text


class DecisionAgent(BaseAgent):
    """决策Agent - 最终投资建议生成"""

    def __init__(self):
        super().__init__(
            name="决策Agent",
            description="综合所有SubAgent分析结果，做出最终投资建议",
            system_prompt=DECISION_SYSTEM_PROMPT,
            llm_config=settings.DECISION_AGENT_LLM,
        )

    def build_user_prompt(self, context: AgentContext) -> str:
        """构建用户提示词"""
        fund_data = context.fund_data
        fund_info = fund_data.info if fund_data else None

        # 获取各Agent的分析结果
        data_analysis = context.data_analysis or {}
        news_analysis = context.news_analysis or {}
        risk_assessment = context.risk_assessment or {}

        # 最新净值
        latest_nav = "未知"
        if fund_data and fund_data.nav_history:
            latest_nav = f"{fund_data.nav_history[-1].nav:.4f}"

        return DECISION_USER_TEMPLATE.format(
            fund_code=fund_info.code if fund_info else "未知",
            fund_name=fund_info.name if fund_info else "未知",
            fund_type=fund_info.type if fund_info else "未知",
            latest_nav=latest_nav,
            data_confidence=data_analysis.get("confidence", 0),
            data_analysis=json.dumps(data_analysis.get("structured_data", {}), ensure_ascii=False, indent=2),
            news_confidence=news_analysis.get("confidence", 0),
            news_analysis=json.dumps(news_analysis.get("structured_data", {}), ensure_ascii=False, indent=2),
            risk_confidence=risk_assessment.get("confidence", 0),
            risk_analysis=json.dumps(risk_assessment.get("structured_data", {}), ensure_ascii=False, indent=2),
        )

    def parse_result(self, raw_output: str, context: AgentContext) -> AgentResult:
        """解析LLM输出"""
        data = extract_json_from_text(raw_output)
        return AgentResult(
            agent_name=self.name,
            analysis_text=data.get("summary", raw_output[:500]),
            structured_data=data,
            confidence=data.get("confidence", 0.5),
        )


decision_agent = DecisionAgent()
