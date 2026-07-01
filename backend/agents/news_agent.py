"""财经热点Agent - 新闻分析与市场情绪判断"""
import json
from typing import List

from config import settings
from models.schemas import AgentContext, AgentResult, NewsItem
from agents.base_agent import BaseAgent
from agents.prompts.news_analysis import NEWS_ANALYSIS_SYSTEM_PROMPT, NEWS_ANALYSIS_USER_TEMPLATE
from utils.helpers import extract_json_from_text


class NewsAgent(BaseAgent):
    """财经热点Agent - 分析新闻对基金的影响"""

    def __init__(self):
        super().__init__(
            name="财经热点Agent",
            description="采集并分析与基金相关的财经热点和政策信号",
            system_prompt=NEWS_ANALYSIS_SYSTEM_PROMPT,
            llm_config=settings.NEWS_AGENT_LLM,
        )

    def build_user_prompt(self, context: AgentContext) -> str:
        """构建用户提示词"""
        fund_info = context.fund_info or (context.fund_data.info if context.fund_data else None)
        news_data = context.news_data or []

        # 格式化新闻列表
        news_list_str = ""
        for i, news in enumerate(news_data[:15], 1):
            news_list_str += f"{i}. [{news.source}] {news.title}\n"
            if news.summary:
                news_list_str += f"   摘要: {news.summary[:100]}\n"
            news_list_str += f"   时间: {news.publish_time}\n\n"

        if not news_list_str:
            news_list_str = "暂无最新新闻数据"

        # 从context中获取热点和情绪数据（如果有的话）
        hot_topics_str = "暂无板块数据"
        market_sentiment_str = "暂无情绪数据"

        return NEWS_ANALYSIS_USER_TEMPLATE.format(
            fund_code=fund_info.code if fund_info else "未知",
            fund_name=fund_info.name if fund_info else "未知",
            fund_type=fund_info.type if fund_info else "未知",
            news_list=news_list_str,
            hot_topics=hot_topics_str,
            market_sentiment=market_sentiment_str,
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


news_agent = NewsAgent()
