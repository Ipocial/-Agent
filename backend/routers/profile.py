"""个人信息管理路由 - 基础信息修改 + API Key 管理"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.db_models import User, UserApiKey
from routers.auth import get_current_user_dep, hash_password, verify_password

router = APIRouter()


# ============ Pydantic 模型 ============

class ProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: str


class UpdateEmailRequest(BaseModel):
    email: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class ApiKeyCreateRequest(BaseModel):
    provider: str  # openai / anthropic / dashscope / custom
    api_key: str
    base_url: str = ""  # 自定义中转站 URL
    label: str = ""


class ApiKeyResponse(BaseModel):
    id: int
    provider: str
    api_key_masked: str  # 只展示前6后4
    base_url: str
    label: str
    created_at: str


# ============ 基础信息 ============

@router.get("/", response_model=ProfileResponse)
async def get_profile(user: User = Depends(get_current_user_dep)):
    """获取个人基础信息"""
    return ProfileResponse(
        id=user.id,
        username=user.username,
        email=user.email or "",
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


@router.put("/email")
async def update_email(
    req: UpdateEmailRequest,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """修改邮箱"""
    user.email = req.email
    db.add(user)
    await db.commit()
    return {"message": "邮箱已更新", "email": req.email}


@router.put("/password")
async def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """修改密码"""
    if not verify_password(req.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="原密码错误")
    if len(req.new_password) < 4:
        raise HTTPException(status_code=400, detail="新密码长度至少 4 位")

    user.password_hash = hash_password(req.new_password)
    db.add(user)
    await db.commit()
    return {"message": "密码已修改"}


# ============ API Key 管理 ============

def mask_api_key(key: str) -> str:
    """脱敏：只显示前6后4"""
    if len(key) <= 10:
        return key[:3] + "***"
    return key[:6] + "***" + key[-4:]


@router.get("/api-keys", response_model=List[ApiKeyResponse])
async def list_api_keys(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """获取用户所有API Key"""
    result = await db.execute(
        select(UserApiKey).where(UserApiKey.user_id == user.id).order_by(UserApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [
        ApiKeyResponse(
            id=k.id,
            provider=k.provider,
            api_key_masked=mask_api_key(k.api_key),
            base_url=k.base_url or "",
            label=k.label,
            created_at=k.created_at.isoformat() if k.created_at else "",
        )
        for k in keys
    ]


@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    req: ApiKeyCreateRequest,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """新增API Key"""
    if not req.provider.strip():
        raise HTTPException(status_code=400, detail="provider 不能为空")
    if not req.api_key.strip():
        raise HTTPException(status_code=400, detail="API Key 不能为空")

    key = UserApiKey(
        user_id=user.id,
        provider=req.provider.strip(),
        api_key=req.api_key.strip(),
        base_url=req.base_url.strip(),
        label=req.label,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)

    return ApiKeyResponse(
        id=key.id,
        provider=key.provider,
        api_key_masked=mask_api_key(key.api_key),
        base_url=key.base_url or "",
        label=key.label,
        created_at=key.created_at.isoformat() if key.created_at else "",
    )


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """删除API Key"""
    result = await db.execute(
        select(UserApiKey).where(UserApiKey.id == key_id, UserApiKey.user_id == user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API Key 不存在")

    await db.delete(key)
    await db.commit()
    return {"message": "已删除"}
