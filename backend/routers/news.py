"""财经新闻API路由"""
from fastapi import APIRouter, Query

from services.news_service import news_service

router = APIRouter()


@router.get("/financial")
async def get_financial_news(limit: int = Query(20, description="新闻数量")):
    """获取财经新闻"""
    news = await news_service.get_financial_news(limit=limit)
    return {"news": [n.model_dump() for n in news]}


@router.get("/hot-topics")
async def get_hot_topics():
    """获取热点板块"""
    topics = await news_service.get_hot_topics()
    return {"topics": topics}


@router.get("/sentiment")
async def get_market_sentiment():
    """获取市场情绪"""
    sentiment = await news_service.get_market_sentiment()
    return sentiment
