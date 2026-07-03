"""跟踪提醒路由 - 大盘行情 / 技术信号 / 定投计划 / 止盈止损"""
import asyncio
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.db_models import User, DcaPlan, PriceAlert
from routers.auth import get_current_user_dep
from services.fund_service import fund_service

router = APIRouter()


# ============ Pydantic 请求/响应模型 ============

class DcaPlanCreate(BaseModel):
    fund_code: str
    fund_name: str = ""
    monthly_amount: float
    day_of_month: int       # 1-28
    start_date: date
    note: str = ""


class DcaPlanResponse(BaseModel):
    id: int
    fund_code: str
    fund_name: str
    monthly_amount: float
    day_of_month: int
    start_date: str
    active: bool
    note: str
    created_at: str


class AlertCreate(BaseModel):
    fund_code: str
    fund_name: str = ""
    alert_type: str         # "profit" | "loss"
    target_pct: float       # 正数=止盈目标%，负数=止损目标%
    cost_price: float


class AlertResponse(BaseModel):
    id: int
    fund_code: str
    fund_name: str
    alert_type: str
    target_pct: float
    cost_price: float
    active: bool
    triggered_at: Optional[str]
    created_at: str


# ============ 大盘行情（无需认证）============

@router.get("/market")
async def get_market():
    """获取三大指数实时行情"""
    data = await fund_service.get_market_indices()
    return {"indices": data}


# ============ 技术信号 ============

@router.get("/signals/{fund_code}")
async def get_signals(fund_code: str):
    """获取基金技术指标信号（MA均线 + RSI + 金叉/死叉）"""
    result = await fund_service.get_technical_signals(fund_code)
    return result


# ============ 定投计划 CRUD ============

@router.get("/dca-plans", response_model=List[DcaPlanResponse])
async def list_dca_plans(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DcaPlan).where(DcaPlan.user_id == user.id).order_by(DcaPlan.created_at.desc())
    )
    plans = result.scalars().all()
    return [
        DcaPlanResponse(
            id=p.id, fund_code=p.fund_code, fund_name=p.fund_name,
            monthly_amount=p.monthly_amount, day_of_month=p.day_of_month,
            start_date=str(p.start_date), active=p.active, note=p.note,
            created_at=p.created_at.isoformat() if p.created_at else "",
        )
        for p in plans
    ]


@router.post("/dca-plans", response_model=DcaPlanResponse)
async def create_dca_plan(
    req: DcaPlanCreate,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    if not 1 <= req.day_of_month <= 28:
        raise HTTPException(status_code=400, detail="定投日期须在 1-28 之间")
    if req.monthly_amount <= 0:
        raise HTTPException(status_code=400, detail="定投金额须大于 0")

    plan = DcaPlan(
        user_id=user.id,
        fund_code=req.fund_code.strip(),
        fund_name=req.fund_name,
        monthly_amount=req.monthly_amount,
        day_of_month=req.day_of_month,
        start_date=req.start_date,
        note=req.note,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return DcaPlanResponse(
        id=plan.id, fund_code=plan.fund_code, fund_name=plan.fund_name,
        monthly_amount=plan.monthly_amount, day_of_month=plan.day_of_month,
        start_date=str(plan.start_date), active=plan.active, note=plan.note,
        created_at=plan.created_at.isoformat() if plan.created_at else "",
    )


@router.delete("/dca-plans/{plan_id}")
async def delete_dca_plan(
    plan_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DcaPlan).where(DcaPlan.id == plan_id, DcaPlan.user_id == user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")
    await db.delete(plan)
    await db.commit()
    return {"message": "已删除"}


@router.get("/dca-plans/{plan_id}/simulate")
async def simulate_dca(
    plan_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """模拟定投历史收益：从 start_date 到今日，每月第 day_of_month 日买入"""
    result = await db.execute(
        select(DcaPlan).where(DcaPlan.id == plan_id, DcaPlan.user_id == user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")

    # 计算需要的天数
    days_needed = (date.today() - plan.start_date).days + 30
    days_needed = max(days_needed, 30)

    nav_history = await fund_service.get_fund_nav_history(plan.fund_code, days=min(days_needed, 365 * 5))
    if not nav_history:
        return {"error": "无法获取净值数据", "total_invested": 0, "current_value": 0, "total_return_pct": 0}

    # 建立日期→净值映射
    nav_map = {n.date: n.nav for n in nav_history}
    dates_sorted = sorted(nav_map.keys())

    total_shares = 0.0
    total_invested = 0.0
    monthly_records = []

    # 遍历从 start_date 到今日的每月定投日
    today = date.today()
    current = plan.start_date.replace(day=1)

    while current <= today:
        # 找这个月的定投日（第 day_of_month 日）
        try:
            invest_date = current.replace(day=plan.day_of_month)
        except ValueError:
            current = (current.replace(day=28) + __import__('datetime').timedelta(days=4)).replace(day=1)
            continue

        if invest_date > today:
            break

        # 找最近的有净值的日期
        actual_date = invest_date.isoformat()
        for d in dates_sorted:
            if d >= actual_date:
                actual_date = d
                break

        nav_price = nav_map.get(actual_date)
        if nav_price and nav_price > 0:
            shares_bought = plan.monthly_amount / nav_price
            total_shares += shares_bought
            total_invested += plan.monthly_amount
            monthly_records.append({
                "date": actual_date,
                "nav": nav_price,
                "shares": round(shares_bought, 4),
                "invested": plan.monthly_amount,
            })

        # 下一个月
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1, day=1)
        else:
            current = current.replace(month=current.month + 1, day=1)

    # 当前市值（用最新净值）
    latest_nav = nav_history[-1].nav if nav_history else 0
    current_value = total_shares * latest_nav
    total_return_pct = ((current_value - total_invested) / total_invested * 100) if total_invested > 0 else 0

    return {
        "fund_code": plan.fund_code,
        "fund_name": plan.fund_name,
        "total_invested": round(total_invested, 2),
        "current_value": round(current_value, 2),
        "total_shares": round(total_shares, 4),
        "total_return": round(current_value - total_invested, 2),
        "total_return_pct": round(total_return_pct, 2),
        "latest_nav": latest_nav,
        "invest_count": len(monthly_records),
        "monthly_records": monthly_records[-12:],  # 最近12条
    }


# ============ 止盈止损提醒 CRUD ============

@router.get("/alerts", response_model=List[AlertResponse])
async def list_alerts(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PriceAlert).where(PriceAlert.user_id == user.id).order_by(PriceAlert.created_at.desc())
    )
    alerts = result.scalars().all()
    return [
        AlertResponse(
            id=a.id, fund_code=a.fund_code, fund_name=a.fund_name,
            alert_type=a.alert_type, target_pct=a.target_pct, cost_price=a.cost_price,
            active=a.active,
            triggered_at=a.triggered_at.isoformat() if a.triggered_at else None,
            created_at=a.created_at.isoformat() if a.created_at else "",
        )
        for a in alerts
    ]


@router.post("/alerts", response_model=AlertResponse)
async def create_alert(
    req: AlertCreate,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    if req.alert_type not in ("profit", "loss"):
        raise HTTPException(status_code=400, detail="alert_type 须为 profit 或 loss")
    if req.cost_price <= 0:
        raise HTTPException(status_code=400, detail="成本价须大于 0")

    alert = PriceAlert(
        user_id=user.id,
        fund_code=req.fund_code.strip(),
        fund_name=req.fund_name,
        alert_type=req.alert_type,
        target_pct=req.target_pct,
        cost_price=req.cost_price,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return AlertResponse(
        id=alert.id, fund_code=alert.fund_code, fund_name=alert.fund_name,
        alert_type=alert.alert_type, target_pct=alert.target_pct, cost_price=alert.cost_price,
        active=alert.active, triggered_at=None,
        created_at=alert.created_at.isoformat() if alert.created_at else "",
    )


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PriceAlert).where(PriceAlert.id == alert_id, PriceAlert.user_id == user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="提醒不存在")
    await db.delete(alert)
    await db.commit()
    return {"message": "已删除"}


@router.get("/check-alerts")
async def check_alerts(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """检查用户 active 提醒是否触发（并发获取实时估值，不自动关闭）"""
    result = await db.execute(
        select(PriceAlert).where(PriceAlert.user_id == user.id, PriceAlert.active == True)
    )
    active_alerts = result.scalars().all()
    if not active_alerts:
        return {"triggered": []}

    # 并发获取实时估值
    async def check_one(alert: PriceAlert):
        try:
            est = await fund_service.get_fund_realtime_estimate(alert.fund_code)
            if not est:
                return None
            current_nav = float(est.get("estimate_nav", 0) or 0)
            if current_nav <= 0:
                return None
            current_pct = (current_nav - alert.cost_price) / alert.cost_price * 100
            triggered = False
            if alert.alert_type == "profit" and current_pct >= alert.target_pct:
                triggered = True
            elif alert.alert_type == "loss" and current_pct <= alert.target_pct:
                triggered = True
            if triggered:
                return {
                    "alert": AlertResponse(
                        id=alert.id, fund_code=alert.fund_code, fund_name=alert.fund_name,
                        alert_type=alert.alert_type, target_pct=alert.target_pct,
                        cost_price=alert.cost_price, active=alert.active,
                        triggered_at=None,
                        created_at=alert.created_at.isoformat() if alert.created_at else "",
                    ).model_dump(),
                    "current_pct": round(current_pct, 2),
                    "current_nav": current_nav,
                }
        except Exception:
            pass
        return None

    tasks = [check_one(a) for a in active_alerts]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    triggered = [r for r in results if r and isinstance(r, dict)]
    return {"triggered": triggered}
