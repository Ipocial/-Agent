"""Pydantic 数据模型定义"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import date


# ============ 基金数据模型 ============

class FundInfo(BaseModel):
    """基金基本信息"""
    code: str
    name: str
    type: str = ""  # 股票型/混合型/债券型/指数型等
    manager: str = ""
    company: str = ""
    size: str = ""  # 基金规模
    establishment_date: str = ""


class FundNAV(BaseModel):
    """基金净值数据"""
    date: str
    nav: float  # 单位净值
    acc_nav: float = 0.0  # 累计净值
    daily_return: float = 0.0  # 日收益率


class FundFullData(BaseModel):
    """基金完整数据"""
    info: FundInfo
    nav_history: List[FundNAV] = []


# ============ 新闻数据模型 ============

class NewsItem(BaseModel):
    """新闻条目"""
    title: str
    summary: str = ""
    source: str = ""
    publish_time: str = ""
    url: str = ""


# ============ Agent相关模型 ============

class AgentContext(BaseModel):
    """Agent执行上下文"""
    fund_data: Optional[FundFullData] = None
    news_data: Optional[List[NewsItem]] = None
    fund_info: Optional[FundInfo] = None
    data_analysis: Optional[Dict[str, Any]] = None
    news_analysis: Optional[Dict[str, Any]] = None
    risk_assessment: Optional[Dict[str, Any]] = None


class AgentResult(BaseModel):
    """Agent执行结果"""
    agent_name: str
    analysis_text: str = ""
    structured_data: Dict[str, Any] = {}
    confidence: float = 0.0
    success: bool = True
    error: Optional[str] = None


class AgentProgress(BaseModel):
    """Agent执行进度"""
    agent_name: str
    status: str = "pending"  # pending / running / completed / failed
    progress_pct: int = 0
    partial_result: Optional[str] = None


# ============ API请求/响应模型 ============

class AnalysisRequest(BaseModel):
    """分析请求"""
    fund_code: str
    model_provider: str = "openai"
    model_name: str = "gpt-4o"


class FinalReport(BaseModel):
    """最终分析报告"""
    rating: str  # 强烈推荐/推荐/观望/谨慎/不推荐
    summary: str
    detailed_analysis: Dict[str, str] = {}
    action_suggestion: Dict[str, str] = {}
    risk_warnings: List[str] = []
    agent_consensus: float = 0.0
    disclaimer: str = "本建议仅供参考，不构成投资建议。投资有风险，入市需谨慎。"
    agent_results: Dict[str, AgentResult] = {}
