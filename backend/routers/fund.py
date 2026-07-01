"""基金数据API路由"""
from fastapi import APIRouter, Query

from services.fund_service import fund_service

router = APIRouter()


@router.get("/search")
async def search_funds(keyword: str = Query(..., description="搜索关键字（基金代码或名称）")):
    """搜索基金"""
    funds = await fund_service.search_funds(keyword)
    return {"funds": [f.model_dump() for f in funds]}


@router.get("/{code}/nav")
async def get_fund_nav(code: str, days: int = Query(90, description="获取天数")):
    """获取基金净值历史"""
    nav_history = await fund_service.get_fund_nav_history(code, days=days)
    return {"code": code, "nav_history": [n.model_dump() for n in nav_history]}


@router.get("/{code}/info")
async def get_fund_info(code: str):
    """获取基金基本信息"""
    info = await fund_service.get_fund_info(code)
    return info.model_dump()


@router.get("/{code}/estimate")
async def get_fund_estimate(code: str):
    """获取基金实时估值"""
    estimate = await fund_service.get_fund_realtime_estimate(code)
    if estimate:
        return estimate
    return {"error": "暂无估值数据"}
