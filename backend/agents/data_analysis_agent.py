"""数据分析Agent - 基金净值技术分析"""
import json
import numpy as np
from typing import List

from config import settings
from models.schemas import AgentContext, AgentResult, FundNAV
from agents.base_agent import BaseAgent
from agents.prompts.data_analysis import DATA_ANALYSIS_SYSTEM_PROMPT, DATA_ANALYSIS_USER_TEMPLATE
from utils.helpers import extract_json_from_text


class DataAnalysisAgent(BaseAgent):
    """数据分析Agent - 深度技术面分析"""

    def __init__(self):
        super().__init__(
            name="数据分析Agent",
            description="对基金净值数据进行技术指标分析和趋势判断",
            system_prompt=DATA_ANALYSIS_SYSTEM_PROMPT,
            llm_config=settings.DATA_AGENT_LLM,
        )

    def _calculate_metrics(self, nav_history: List[FundNAV]) -> dict:
        """预计算技术指标，减轻LLM负担"""
        if not nav_history or len(nav_history) < 2:
            return {}

        navs = [item.nav for item in nav_history]
        returns = [item.daily_return for item in nav_history[1:]]

        nav_arr = np.array(navs)
        ret_arr = np.array(returns)

        metrics = {
            "latest_nav": navs[-1],
            "max_nav": max(navs),
            "min_nav": min(navs),
            "total_days": len(navs),
        }

        # 收益率
        if len(navs) >= 7:
            metrics["return_7d"] = (navs[-1] - navs[-7]) / navs[-7]
        if len(navs) >= 30:
            metrics["return_30d"] = (navs[-1] - navs[-30]) / navs[-30]
        metrics["return_total"] = (navs[-1] - navs[0]) / navs[0]

        # 波动率（年化）
        if len(ret_arr) > 0:
            metrics["volatility"] = float(np.std(ret_arr) * np.sqrt(252))

        # 最大回撤
        peak = nav_arr[0]
        max_dd = 0
        for nav in nav_arr:
            if nav > peak:
                peak = nav
            dd = (peak - nav) / peak
            if dd > max_dd:
                max_dd = dd
        metrics["max_drawdown"] = -max_dd

        # 简单MA
        if len(navs) >= 5:
            metrics["ma5"] = float(np.mean(navs[-5:]))
        if len(navs) >= 20:
            metrics["ma20"] = float(np.mean(navs[-20:]))
        if len(navs) >= 60:
            metrics["ma60"] = float(np.mean(navs[-60:]))

        return metrics

    def build_user_prompt(self, context: AgentContext) -> str:
        """构建用户提示词"""
        fund_data = context.fund_data
        if not fund_data:
            return "无基金数据"

        nav_history = fund_data.nav_history
        metrics = self._calculate_metrics(nav_history)

        # 格式化净值数据（取最近30条避免token过多）
        recent_navs = nav_history[-30:] if len(nav_history) > 30 else nav_history
        nav_data_str = "\n".join([
            f"{item.date}: 净值={item.nav:.4f}, 日收益率={item.daily_return:.4%}"
            for item in recent_navs
        ])

        return DATA_ANALYSIS_USER_TEMPLATE.format(
            fund_code=fund_data.info.code,
            fund_name=fund_data.info.name,
            fund_type=fund_data.info.type or "未知",
            fund_manager=fund_data.info.manager or "未知",
            nav_data=nav_data_str,
            total_days=metrics.get("total_days", 0),
            latest_nav=f"{metrics.get('latest_nav', 0):.4f}",
            max_nav=f"{metrics.get('max_nav', 0):.4f}",
            min_nav=f"{metrics.get('min_nav', 0):.4f}",
            period_return=f"{metrics.get('return_total', 0):.2%}",
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


data_analysis_agent = DataAnalysisAgent()
