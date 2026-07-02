"""持仓管理 CRUD 路由"""
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.db_models import User, Portfolio
from routers.auth import get_current_user_dep
from services.fund_service import fund_service

router = APIRouter()


# ============ Pydantic 模型 ============

class PortfolioCreate(BaseModel):
    fund_code: str
    fund_name: str = ""
    buy_date: date
    shares: float
    cost_price: float
    note: str = ""


class PortfolioUpdate(BaseModel):
    fund_name: Optional[str] = None
    buy_date: Optional[date] = None
    shares: Optional[float] = None
    cost_price: Optional[float] = None
    note: Optional[str] = None


class PortfolioResponse(BaseModel):
    id: int
    fund_code: str
    fund_name: str
    buy_date: str
    shares: float
    cost_price: float
    note: str
    created_at: str

    class Config:
        from_attributes = True


class PortfolioSummaryItem(BaseModel):
    id: int
    fund_code: str
    fund_name: str
    buy_date: str
    shares: float
    cost_price: float
    current_nav: float
    total_cost: float
    current_value: float
    profit: float
    profit_rate: float  # 收益率 (%)


# ============ 路由 ============

@router.get("/", response_model=List[PortfolioResponse])
async def list_portfolio(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户所有持仓"""
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user.id).order_by(Portfolio.created_at.desc())
    )
    items = result.scalars().all()
    return [
        PortfolioResponse(
            id=p.id,
            fund_code=p.fund_code,
            fund_name=p.fund_name,
            buy_date=p.buy_date.isoformat(),
            shares=p.shares,
            cost_price=p.cost_price,
            note=p.note,
            created_at=p.created_at.isoformat() if p.created_at else "",
        )
        for p in items
    ]


@router.post("/", response_model=PortfolioResponse)
async def create_portfolio(
    req: PortfolioCreate,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """添加持仓记录"""
    portfolio = Portfolio(
        user_id=user.id,
        fund_code=req.fund_code,
        fund_name=req.fund_name,
        buy_date=req.buy_date,
        shares=req.shares,
        cost_price=req.cost_price,
        note=req.note,
    )
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio)
    return PortfolioResponse(
        id=portfolio.id,
        fund_code=portfolio.fund_code,
        fund_name=portfolio.fund_name,
        buy_date=portfolio.buy_date.isoformat(),
        shares=portfolio.shares,
        cost_price=portfolio.cost_price,
        note=portfolio.note,
        created_at=portfolio.created_at.isoformat() if portfolio.created_at else "",
    )


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    req: PortfolioUpdate,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """修改持仓记录"""
    result = await db.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.user_id == user.id)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="持仓记录不存在")

    if req.fund_name is not None:
        portfolio.fund_name = req.fund_name
    if req.buy_date is not None:
        portfolio.buy_date = req.buy_date
    if req.shares is not None:
        portfolio.shares = req.shares
    if req.cost_price is not None:
        portfolio.cost_price = req.cost_price
    if req.note is not None:
        portfolio.note = req.note

    await db.commit()
    await db.refresh(portfolio)
    return PortfolioResponse(
        id=portfolio.id,
        fund_code=portfolio.fund_code,
        fund_name=portfolio.fund_name,
        buy_date=portfolio.buy_date.isoformat(),
        shares=portfolio.shares,
        cost_price=portfolio.cost_price,
        note=portfolio.note,
        created_at=portfolio.created_at.isoformat() if portfolio.created_at else "",
    )


@router.delete("/{portfolio_id}")
async def delete_portfolio(
    portfolio_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """删除持仓记录"""
    result = await db.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.user_id == user.id)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="持仓记录不存在")

    await db.delete(portfolio)
    await db.commit()
    return {"message": "删除成功"}


@router.get("/summary", response_model=List[PortfolioSummaryItem])
async def portfolio_summary(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """持仓汇总（附当前净值+盈亏计算）"""
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user.id).order_by(Portfolio.created_at.desc())
    )
    items = result.scalars().all()
    summaries = []

    for p in items:
        # 获取最新净值
        try:
            nav_list = await fund_service.get_fund_nav_history(p.fund_code, days=1)
            current_nav = nav_list[-1].nav if nav_list else p.cost_price
        except Exception:
            current_nav = p.cost_price

        total_cost = p.shares * p.cost_price
        current_value = p.shares * current_nav
        profit = current_value - total_cost
        profit_rate = (profit / total_cost * 100) if total_cost > 0 else 0.0

        summaries.append(PortfolioSummaryItem(
            id=p.id,
            fund_code=p.fund_code,
            fund_name=p.fund_name,
            buy_date=p.buy_date.isoformat(),
            shares=p.shares,
            cost_price=p.cost_price,
            current_nav=round(current_nav, 4),
            total_cost=round(total_cost, 2),
            current_value=round(current_value, 2),
            profit=round(profit, 2),
            profit_rate=round(profit_rate, 2),
        ))

    return summaries
