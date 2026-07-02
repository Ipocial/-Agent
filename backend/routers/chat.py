"""聊天路由 - SSE 流式对话 + 历史管理"""
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.db_models import User, ChatMessage
from routers.auth import get_current_user_dep
from config import LLMConfig
from agents.assistant_agent import AssistantAgent

router = APIRouter()


# ============ Pydantic 模型 ============

class ChatRequest(BaseModel):
    message: str
    model_provider: str = "openai"
    model_name: str = "gpt-4o"


class ChatHistoryItem(BaseModel):
    id: int
    role: str
    content: str
    created_at: str


# ============ 路由 ============

@router.post("/stream")
async def chat_stream(
    req: ChatRequest,
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """SSE 流式聊天"""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    # 保存用户消息
    user_msg = ChatMessage(user_id=user.id, role="user", content=req.message)
    db.add(user_msg)
    await db.commit()

    # 加载最近的对话历史（最多20条）
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(desc(ChatMessage.created_at))
        .limit(20)
    )
    history_items = list(reversed(result.scalars().all()))

    # 构建消息列表
    messages = []
    for msg in history_items:
        if msg.role in ("user", "assistant"):
            messages.append({"role": msg.role, "content": msg.content})

    # 配置 LLM
    llm_config = LLMConfig(
        provider=req.model_provider,
        model=req.model_name,
        temperature=0.7,
        max_tokens=2048,
    )

    agent = AssistantAgent(llm_config=llm_config)

    async def event_generator():
        full_response = ""
        try:
            async for event in agent.run_stream(messages, user.id, db):
                event_type = event["type"]

                if event_type == "tool_call":
                    line = json.dumps({"type": "tool_call", "tool": event["tool"], "args": event["args"]}, ensure_ascii=False)
                    yield f"data: {line}\n\n"

                elif event_type == "tool_result":
                    line = json.dumps({"type": "tool_result", "tool": event["tool"], "result": event["result"]}, ensure_ascii=False)
                    yield f"data: {line}\n\n"

                elif event_type == "content":
                    full_response += event["content"]
                    line = json.dumps({"type": "content", "content": event["content"]}, ensure_ascii=False)
                    yield f"data: {line}\n\n"

                elif event_type == "done":
                    full_response = event.get("full_response", full_response)
                    line = json.dumps({"type": "done"}, ensure_ascii=False)
                    yield f"data: {line}\n\n"

        except Exception as e:
            error_line = json.dumps({"type": "error", "content": f"助理出错: {str(e)}"}, ensure_ascii=False)
            yield f"data: {error_line}\n\n"
            full_response = f"[Error] {str(e)}"

        # 保存 assistant 回复
        if full_response:
            assistant_msg = ChatMessage(user_id=user.id, role="assistant", content=full_response)
            db.add(assistant_msg)
            await db.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history", response_model=List[ChatHistoryItem])
async def get_history(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """获取对话历史"""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(desc(ChatMessage.created_at))
        .limit(limit)
    )
    items = list(reversed(result.scalars().all()))
    return [
        ChatHistoryItem(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at.isoformat() if msg.created_at else "",
        )
        for msg in items
    ]


@router.delete("/history")
async def clear_history(
    user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """清空对话历史"""
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.user_id == user.id)
    )
    messages = result.scalars().all()
    for msg in messages:
        await db.delete(msg)
    await db.commit()
    return {"message": "对话历史已清空"}
