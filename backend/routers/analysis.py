"""分析与建议API路由 - 包含WebSocket支持"""
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

from config import LLMConfig
from models.schemas import AnalysisRequest, AgentProgress
from agents.orchestrator import orchestrator

router = APIRouter()

# 存储WebSocket连接
active_connections: Dict[str, List[WebSocket]] = {}


@router.post("/recommend")
async def run_analysis(request: AnalysisRequest):
    """触发Multi-Agent分析流程"""
    # 构建LLM配置
    model_config = LLMConfig(
        provider=request.model_provider,
        model=request.model_name,
    )

    # 收集进度信息
    progress_log = []

    async def collect_progress(progress: AgentProgress):
        progress_log.append(progress.model_dump())

    # 运行分析
    report = await orchestrator.run_analysis(
        fund_code=request.fund_code,
        model_config=model_config,
        progress_callback=collect_progress,
    )

    return {
        "report": report.model_dump(),
        "progress_log": progress_log,
    }


@router.websocket("/ws/{task_id}")
async def websocket_analysis(websocket: WebSocket, task_id: str):
    """WebSocket实时推送Agent执行进度"""
    await websocket.accept()

    try:
        # 等待客户端发送分析请求
        data = await websocket.receive_text()
        request = json.loads(data)

        fund_code = request.get("fund_code", "")
        model_provider = request.get("model_provider", "openai")
        model_name = request.get("model_name", "gpt-4o")

        if not fund_code:
            await websocket.send_json({"error": "请提供基金代码"})
            await websocket.close()
            return

        model_config = LLMConfig(provider=model_provider, model=model_name)

        # 进度回调：通过WebSocket推送
        async def ws_progress_callback(progress: AgentProgress):
            await websocket.send_json({
                "type": "progress",
                "data": progress.model_dump(),
            })

        # 运行分析
        report = await orchestrator.run_analysis(
            fund_code=fund_code,
            model_config=model_config,
            progress_callback=ws_progress_callback,
        )

        # 发送最终结果
        await websocket.send_json({
            "type": "result",
            "data": report.model_dump(),
        })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
