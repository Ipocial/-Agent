"""Orchestrator - Leader Agent，负责任务编排和调度"""
import asyncio
import uuid
from typing import Dict, Callable, Optional

from config import LLMConfig
from models.schemas import (
    AgentContext, AgentResult, AgentProgress, FinalReport, FundFullData, NewsItem
)
from services.fund_service import fund_service
from services.news_service import news_service
from agents.data_analysis_agent import data_analysis_agent
from agents.news_agent import news_agent
from agents.risk_agent import risk_agent
from agents.decision_agent import decision_agent


class Orchestrator:
    """编排器 - 协调多Agent协作完成分析任务"""

    def __init__(self):
        self.progress_callbacks: Dict[str, Callable] = {}

    async def run_analysis(
        self,
        fund_code: str,
        model_config: Optional[LLMConfig] = None,
        progress_callback: Optional[Callable] = None,
    ) -> FinalReport:
        """
        执行完整的Multi-Agent分析流程
        
        Args:
            fund_code: 基金代码
            model_config: 可选的LLM模型配置覆盖
            progress_callback: 进度回调函数
        """
        task_id = str(uuid.uuid4())

        async def report_progress(agent_name: str, status: str, pct: int, partial: str = ""):
            if progress_callback:
                await progress_callback(AgentProgress(
                    agent_name=agent_name,
                    status=status,
                    progress_pct=pct,
                    partial_result=partial,
                ))

        # ========== Phase 1: 数据采集（并行） ==========
        await report_progress("数据采集", "running", 10, "正在获取基金数据和财经新闻...")

        fund_data, news_data = await asyncio.gather(
            fund_service.get_fund_full_data(fund_code),
            news_service.get_financial_news(limit=20),
        )

        await report_progress("数据采集", "completed", 20, "数据采集完成")

        # ========== Phase 2: 并行分析（数据分析Agent + 财经热点Agent） ==========
        await report_progress("数据分析Agent", "running", 25, "正在分析净值数据和技术指标...")
        await report_progress("财经热点Agent", "running", 25, "正在分析财经新闻和市场热点...")

        # 构建各Agent的上下文
        data_context = AgentContext(fund_data=fund_data)
        news_context = AgentContext(
            news_data=news_data,
            fund_info=fund_data.info,
        )

        # 并行执行数据分析和热点分析
        data_result, news_result = await asyncio.gather(
            data_analysis_agent.execute(data_context),
            news_agent.execute(news_context),
        )

        await report_progress("数据分析Agent", "completed", 50, data_result.analysis_text[:100])
        await report_progress("财经热点Agent", "completed", 55, news_result.analysis_text[:100])

        # ========== Phase 3: 串行执行风险评估Agent（依赖数据分析结果） ==========
        await report_progress("风险评估Agent", "running", 60, "正在评估投资风险...")

        risk_context = AgentContext(
            fund_data=fund_data,
            data_analysis={
                "analysis_text": data_result.analysis_text,
                "structured_data": data_result.structured_data,
                "confidence": data_result.confidence,
            },
        )
        risk_result = await risk_agent.execute(risk_context)

        await report_progress("风险评估Agent", "completed", 75, risk_result.analysis_text[:100])

        # ========== Phase 4: 最终决策 ==========
        await report_progress("决策Agent", "running", 80, "正在综合各方分析生成最终建议...")

        decision_context = AgentContext(
            fund_data=fund_data,
            data_analysis={
                "analysis_text": data_result.analysis_text,
                "structured_data": data_result.structured_data,
                "confidence": data_result.confidence,
            },
            news_analysis={
                "analysis_text": news_result.analysis_text,
                "structured_data": news_result.structured_data,
                "confidence": news_result.confidence,
            },
            risk_assessment={
                "analysis_text": risk_result.analysis_text,
                "structured_data": risk_result.structured_data,
                "confidence": risk_result.confidence,
            },
        )
        decision_result = await decision_agent.execute(decision_context)

        await report_progress("决策Agent", "completed", 100, "分析完成！")

        # ========== 构建最终报告 ==========
        decision_data = decision_result.structured_data

        final_report = FinalReport(
            rating=decision_data.get("rating", "观望"),
            summary=decision_data.get("summary", decision_result.analysis_text),
            detailed_analysis=decision_data.get("detailed_analysis", {}),
            action_suggestion=decision_data.get("action_suggestion", {}),
            risk_warnings=decision_data.get("risk_warnings", []),
            agent_consensus=decision_data.get("agent_consensus", 0),
            agent_results={
                "data_analysis": data_result,
                "news_analysis": news_result,
                "risk_assessment": risk_result,
                "decision": decision_result,
            },
        )

        return final_report


orchestrator = Orchestrator()
