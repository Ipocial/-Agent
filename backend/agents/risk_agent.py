"""风险评估Agent - 投资风险综合评估"""
import json

from config import settings
from models.schemas import AgentContext, AgentResult
from agents.base_agent import BaseAgent
from agents.prompts.risk_assessment import RISK_ASSESSMENT_SYSTEM_PROMPT, RISK_ASSESSMENT_USER_TEMPLATE
from utils.helpers import extract_json_from_text


class RiskAgent(BaseAgent):
    """风险评估Agent - 评估基金投资风险"""

    def __init__(self):
        super().__init__(
            name="风险评估Agent",
            description="综合评估基金投资风险，包括下行风险、流动性风险、系统性风险",
            system_prompt=RISK_ASSESSMENT_SYSTEM_PROMPT,
            llm_config=settings.RISK_AGENT_LLM,
        )

    def build_user_prompt(self, context: AgentContext) -> str:
        """构建用户提示词"""
        fund_data = context.fund_data
        data_analysis = context.data_analysis or {}

        fund_info = fund_data.info if fund_data else None

        # 从数据分析Agent结果中提取关键指标
        key_metrics = data_analysis.get("structured_data", {}).get("key_metrics", {})
        technical = data_analysis.get("structured_data", {}).get("technical_signals", {})
        trend = data_analysis.get("structured_data", {}).get("trend", "未知")

        # 数据分析摘要
        data_summary = data_analysis.get("analysis_text", "暂无数据分析结果")

        return RISK_ASSESSMENT_USER_TEMPLATE.format(
            fund_code=fund_info.code if fund_info else "未知",
            fund_name=fund_info.name if fund_info else "未知",
            fund_type=fund_info.type if fund_info else "未知",
            data_analysis_summary=data_summary,
            volatility=f"{key_metrics.get('volatility', 0):.2%}" if key_metrics.get('volatility') else "未知",
            max_drawdown=f"{key_metrics.get('max_drawdown', 0):.2%}" if key_metrics.get('max_drawdown') else "未知",
            return_30d=f"{key_metrics.get('return_30d', 0):.2%}" if key_metrics.get('return_30d') else "未知",
            trend=trend,
            rsi=technical.get("rsi", "未知"),
            market_sentiment="暂无",
        )

    def parse_result(self, raw_output: str, context: AgentContext) -> AgentResult:
        """解析LLM输出"""
        data = extract_json_from_text(raw_output)
        return AgentResult(
            agent_name=self.name,
            analysis_text=data.get("analysis_text", raw_output[:500]),
            structured_data=data,
            confidence=data.get("confidence", 0.5),
        )


risk_agent = RiskAgent()
