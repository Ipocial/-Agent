"""发现基金路由 - 排行榜 / 智能筛选 / 基金对比 / AI 个性化推荐"""
import json
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from config import settings, LLMConfig
from database import get_db
from models.db_models import User, UserApiKey
from routers.auth import get_current_user_dep
from services.fund_service import fund_service

router = APIRouter()


# ============ Pydantic 模型 ============

class RecommendRequest(BaseModel):
    risk_level: int = 3          # 1-5，风险偏好
    amount: float = 10000        # 投资金额（元）
    period_years: int = 3        # 投资期限（年）
    model_provider: str = "openai"
    model_name: str = "gpt-4o"


# ============ 排行榜 ============

@router.get("/ranking")
async def get_ranking(
    ft: str = Query("all", description="基金类型: all/gp/hh/zq/qdii"),
    sc: str = Query("zzf", description="排序: zzf(近1年)/zzf3n(近3年)/zzf6m(近6月)/zzf1m(近1月)/zdf(日涨幅)"),
    pn: int = Query(20, ge=5, le=100),
):
    """基金排行榜"""
    data = await fund_service.get_fund_ranking(ft=ft, sc=sc, pn=pn)
    return {"funds": data, "total": len(data)}


# ============ 智能筛选 ============

@router.get("/filter")
async def filter_funds(
    ft: str = Query("all"),
    sc: str = Query("zzf"),
    min_return_1y: Optional[float] = Query(None, description="近1年最低收益率(%)"),
    max_drawdown: Optional[float] = Query(None, description="最大回撤上限(%)（仅作展示提示，排行榜暂无此字段）"),
    sort_by: str = Query("return_1y", description="排序字段"),
    pn: int = Query(50, ge=10, le=100),
):
    """智能筛选：在排行数据上做二次过滤"""
    raw = await fund_service.get_fund_ranking(ft=ft if ft != "all" else "all", sc=sc, pn=pn)

    results = []
    for fund in raw:
        r1y = fund.get("return_1y", "--")
        if min_return_1y is not None:
            try:
                if float(r1y) < min_return_1y:
                    continue
            except (ValueError, TypeError):
                continue  # "--" 等无效值跳过
        results.append(fund)

    # 排序
    def sort_key(f: dict):
        val = f.get(sort_by, "--")
        try:
            return float(val)
        except (ValueError, TypeError):
            return -999.0

    results.sort(key=sort_key, reverse=True)
    return {"funds": results, "total": len(results)}


# ============ 基金对比 ============

@router.get("/compare")
async def compare_funds(
    codes: str = Query(..., description="逗号分隔的基金代码，最多3只"),
):
    """批量对比基金数据（净值历史 + 风险指标）"""
    code_list = [c.strip() for c in codes.split(",") if c.strip()][:3]
    if not code_list:
        return {"funds": []}
    data = await fund_service.get_funds_compare(code_list)
    return {"funds": data}


# ============ AI 个性化推荐（SSE 流式）============

RISK_LABELS = {1: "保守型（不接受亏损，追求稳健）", 2: "稳健型（可承受少量亏损）", 3: "平衡型（可承受中等波动）", 4: "成长型（可接受较大波动）", 5: "激进型（追求高收益，可承受大幅亏损）"}

TYPE_FOR_RISK = {
    1: ["zq"],               # 保守：债券型
    2: ["zq", "hh"],         # 稳健：债券+混合
    3: ["hh", "gp"],         # 平衡：混合+股票
    4: ["gp", "hh"],         # 成长：股票+混合
    5: ["gp", "qdii"],       # 激进：股票+QDII
}


@router.post("/recommend")
async def ai_recommend(
    req: RecommendRequest,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """AI 个性化基金推荐（SSE 流式）"""
    # 查询用户配置的 API Key
    user_api_key = None
    user_base_url = None
    key_result = await db.execute(
        select(UserApiKey)
        .where(UserApiKey.user_id == user.id, UserApiKey.provider == req.model_provider)
        .limit(1)
    )
    user_key_record = key_result.scalar_one_or_none()
    if user_key_record:
        user_api_key = user_key_record.api_key
        user_base_url = user_key_record.base_url or None

    # 并发拉取推荐类型的基金数据
    fund_types = TYPE_FOR_RISK.get(req.risk_level, ["hh"])
    unique_types = list(dict.fromkeys(fund_types))  # 去重保序

    ranking_tasks = [fund_service.get_fund_ranking(ft=ft, sc="zzf", pn=10) for ft in unique_types]
    ranking_results = await asyncio.gather(*ranking_tasks, return_exceptions=True)

    fund_data_lines = []
    type_names = {"gp": "股票型", "hh": "混合型", "zq": "债券型", "qdii": "QDII"}
    for ft, result in zip(unique_types, ranking_results):
        if isinstance(result, list) and result:
            fund_data_lines.append(f"\n【{type_names.get(ft, ft)}基金 - 近1年收益排行 Top{len(result)}】")
            for f in result[:10]:
                line = (
                    f"  {f['rank']}. {f['code']} {f['name']} | "
                    f"日涨幅:{f['daily_return']}% | 近1月:{f['return_1m']}% | "
                    f"近6月:{f['return_6m']}% | 近1年:{f['return_1y']}% | 近3年:{f['return_3y']}%"
                )
                fund_data_lines.append(line)

    fund_context = "\n".join(fund_data_lines) if fund_data_lines else "（排行数据获取失败，请基于通用知识回答）"

    risk_label = RISK_LABELS.get(req.risk_level, "平衡型")
    amount_str = f"{req.amount:,.0f}元"
    period_str = f"{req.period_years}年"

    prompt = f"""你是一位专业的基金投资顾问。请根据以下用户信息和市场数据，为用户提供个性化基金投资建议。

用户信息：
- 风险偏好：{risk_label}（{req.risk_level}/5分）
- 计划投入：{amount_str}
- 投资期限：{period_str}

当前市场基金排行数据：
{fund_context}

请完成以下分析（使用 Markdown 格式）：

1. **投资策略建议** - 根据用户风险偏好和期限，建议的资产配置比例（如股票型XX%、债券型XX%）

2. **推荐基金组合** - 从上述数据中挑选 3-5 只最适合的基金，说明推荐理由（收益表现、风险特征、适合该用户的原因）

3. **投资金额分配** - 如何将 {amount_str} 在推荐基金中进行分配

4. **风险提示** - 结合用户风险偏好，说明主要风险点和应对策略

5. **操作建议** - 是否建议定投、分批建仓还是一次性投入，以及止盈止损参考

注意：所有建议仅供参考，不构成投资建议，投资有风险入市需谨慎。"""

    # 构建 LLM 客户端
    if user_base_url:
        client = AsyncOpenAI(
            api_key=user_api_key or settings.OPENAI_API_KEY,
            base_url=user_base_url,
        )
    elif req.model_provider == "dashscope":
        client = AsyncOpenAI(
            api_key=user_api_key or settings.DASHSCOPE_API_KEY,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
    elif req.model_provider == "anthropic":
        client = AsyncOpenAI(
            api_key=user_api_key or settings.ANTHROPIC_API_KEY,
            base_url="https://api.anthropic.com/v1",
        )
    else:
        client = AsyncOpenAI(
            api_key=user_api_key or settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )

    async def event_stream():
        try:
            stream = await client.chat.completions.create(
                model=req.model_name,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                temperature=0.7,
                max_tokens=2000,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield f"data: {json.dumps({'type': 'content', 'content': delta.content})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
