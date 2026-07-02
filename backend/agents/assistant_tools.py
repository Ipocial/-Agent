"""助理 Agent 工具定义与执行器"""
import json
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.db_models import Portfolio
from services.fund_service import fund_service
from services.news_service import news_service


# ============ 工具 Schema（OpenAI function calling 格式）============

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "query_fund_nav",
            "description": "查询指定基金的最新净值和近期历史走势，返回净值数据列表",
            "parameters": {
                "type": "object",
                "properties": {
                    "fund_code": {"type": "string", "description": "基金代码，如 008888"},
                    "days": {"type": "integer", "description": "查询天数，默认30", "default": 30},
                },
                "required": ["fund_code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_funds",
            "description": "按名称或代码搜索基金列表",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "搜索关键词（基金代码或名称）"},
                },
                "required": ["keyword"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_news",
            "description": "搜索财经新闻，获取与基金或行业相关的最新热点",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "返回新闻数量，默认10", "default": 10},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_portfolio",
            "description": "获取用户当前所有持仓明细，包含基金代码、名称、建仓日期、份额、成本价",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_profit",
            "description": "计算用户某只基金的详细盈亏情况（当前净值、持仓市值、收益额、收益率）",
            "parameters": {
                "type": "object",
                "properties": {
                    "fund_code": {"type": "string", "description": "基金代码"},
                },
                "required": ["fund_code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_fund_info",
            "description": "获取基金的基本信息（名称、类型、基金经理等）",
            "parameters": {
                "type": "object",
                "properties": {
                    "fund_code": {"type": "string", "description": "基金代码"},
                },
                "required": ["fund_code"],
            },
        },
    },
]


# ============ 工具执行器 ============

async def execute_tool(
    tool_name: str,
    arguments: dict,
    user_id: int,
    db: AsyncSession,
) -> str:
    """执行工具并返回结果字符串"""
    try:
        if tool_name == "query_fund_nav":
            return await _query_fund_nav(arguments)
        elif tool_name == "search_funds":
            return await _search_funds(arguments)
        elif tool_name == "search_news":
            return await _search_news(arguments)
        elif tool_name == "get_user_portfolio":
            return await _get_user_portfolio(user_id, db)
        elif tool_name == "calculate_profit":
            return await _calculate_profit(arguments, user_id, db)
        elif tool_name == "get_fund_info":
            return await _get_fund_info(arguments)
        else:
            return json.dumps({"error": f"未知工具: {tool_name}"}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": f"工具执行失败: {str(e)}"}, ensure_ascii=False)


async def _query_fund_nav(args: dict) -> str:
    fund_code = args.get("fund_code", "")
    days = args.get("days", 30)
    nav_list = await fund_service.get_fund_nav_history(fund_code, days=days)
    if not nav_list:
        return json.dumps({"error": f"未找到基金 {fund_code} 的净值数据"}, ensure_ascii=False)

    # 返回摘要 + 最近数据
    latest = nav_list[-1]
    earliest = nav_list[0]
    change = ((latest.nav - earliest.nav) / earliest.nav * 100) if earliest.nav > 0 else 0

    result = {
        "fund_code": fund_code,
        "period_days": days,
        "latest_nav": latest.nav,
        "latest_date": latest.date,
        "period_change_pct": round(change, 2),
        "recent_5_days": [{"date": n.date, "nav": n.nav} for n in nav_list[-5:]],
    }
    return json.dumps(result, ensure_ascii=False)


async def _search_funds(args: dict) -> str:
    keyword = args.get("keyword", "")
    funds = await fund_service.search_funds(keyword)
    result = [{"code": f.code, "name": f.name, "type": f.type} for f in funds[:10]]
    return json.dumps(result, ensure_ascii=False)


async def _search_news(args: dict) -> str:
    limit = args.get("limit", 10)
    news = await news_service.get_financial_news(limit=limit)
    result = [{"title": n.title, "source": n.source, "time": n.publish_time} for n in news[:limit]]
    return json.dumps(result, ensure_ascii=False)


async def _get_user_portfolio(user_id: int, db: AsyncSession) -> str:
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user_id).order_by(Portfolio.buy_date)
    )
    items = result.scalars().all()
    if not items:
        return json.dumps({"message": "用户当前没有持仓记录"}, ensure_ascii=False)

    portfolio_list = []
    for p in items:
        portfolio_list.append({
            "fund_code": p.fund_code,
            "fund_name": p.fund_name,
            "buy_date": p.buy_date.isoformat(),
            "shares": p.shares,
            "cost_price": p.cost_price,
            "total_cost": round(p.shares * p.cost_price, 2),
            "note": p.note,
        })
    return json.dumps(portfolio_list, ensure_ascii=False)


async def _calculate_profit(args: dict, user_id: int, db: AsyncSession) -> str:
    fund_code = args.get("fund_code", "")
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user_id, Portfolio.fund_code == fund_code)
    )
    items = result.scalars().all()
    if not items:
        return json.dumps({"error": f"用户未持有基金 {fund_code}"}, ensure_ascii=False)

    # 获取最新净值
    nav_list = await fund_service.get_fund_nav_history(fund_code, days=1)
    current_nav = nav_list[-1].nav if nav_list else items[0].cost_price

    profits = []
    total_cost = 0.0
    total_value = 0.0
    for p in items:
        cost = p.shares * p.cost_price
        value = p.shares * current_nav
        profit = value - cost
        rate = (profit / cost * 100) if cost > 0 else 0
        total_cost += cost
        total_value += value
        profits.append({
            "buy_date": p.buy_date.isoformat(),
            "shares": p.shares,
            "cost_price": p.cost_price,
            "total_cost": round(cost, 2),
            "current_value": round(value, 2),
            "profit": round(profit, 2),
            "profit_rate_pct": round(rate, 2),
        })

    total_profit = total_value - total_cost
    total_rate = (total_profit / total_cost * 100) if total_cost > 0 else 0

    return json.dumps({
        "fund_code": fund_code,
        "current_nav": current_nav,
        "nav_date": nav_list[-1].date if nav_list else "unknown",
        "positions": profits,
        "summary": {
            "total_cost": round(total_cost, 2),
            "total_value": round(total_value, 2),
            "total_profit": round(total_profit, 2),
            "total_profit_rate_pct": round(total_rate, 2),
        },
    }, ensure_ascii=False)


async def _get_fund_info(args: dict) -> str:
    fund_code = args.get("fund_code", "")
    info = await fund_service.get_fund_info(fund_code)
    return json.dumps({
        "code": info.code,
        "name": info.name,
        "type": info.type,
        "manager": info.manager,
    }, ensure_ascii=False)
