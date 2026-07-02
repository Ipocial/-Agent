"""ReAct Agent 助理 - 基于 OpenAI function calling 的多步推理"""
import json
from typing import List, Dict, AsyncGenerator

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings, LLMConfig
from agents.assistant_tools import TOOLS_SCHEMA, execute_tool

MAX_ITERATIONS = 8

SYSTEM_PROMPT = """你是一个专业的基金投资助理，名叫"小基"。你的职责是：
1. 帮助用户管理基金持仓，了解收益情况
2. 根据用户持仓、市场数据和新闻热点，提供买入/卖出/加仓/减仓的专业建议
3. 回答基金相关问题，解释金融术语

工作原则：
- 用简洁专业的中文回答
- 给出建议时要说明理由，并注明"仅供参考，不构成投资建议"
- 需要查询数据时主动使用工具，不要凭空编造数据
- 涉及买卖建议时，先查询用户持仓和最新净值，再综合判断
- 格式上适当使用 Markdown（列表、加粗）提高可读性
- 保持友好、专业的语气

当前用户的持仓概要（如有）会在对话中提供。"""


class AssistantAgent:
    """ReAct 风格的助理 Agent"""

    def __init__(self, llm_config: LLMConfig):
        self.llm_config = llm_config

    def _get_client(self) -> AsyncOpenAI:
        """根据 provider 获取对应的 OpenAI 兼容客户端"""
        if self.llm_config.provider == "dashscope":
            return AsyncOpenAI(
                api_key=settings.DASHSCOPE_API_KEY,
                base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            )
        else:
            return AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL,
            )

    async def run_stream(
        self,
        messages: List[Dict[str, str]],
        user_id: int,
        db: AsyncSession,
    ) -> AsyncGenerator[Dict, None]:
        """
        流式执行 ReAct Agent。
        Yields 事件字典：
        - {"type": "tool_call", "tool": "...", "args": {...}}
        - {"type": "tool_result", "tool": "...", "result": "..."}
        - {"type": "content", "content": "..."}
        - {"type": "done", "full_response": "..."}
        """
        client = self._get_client()
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

        full_response = ""
        iteration = 0

        while iteration < MAX_ITERATIONS:
            iteration += 1

            # 调用 LLM（含 tools）
            response = await client.chat.completions.create(
                model=self.llm_config.model,
                messages=full_messages,
                tools=TOOLS_SCHEMA,
                tool_choice="auto",
                temperature=self.llm_config.temperature,
                max_tokens=self.llm_config.max_tokens,
                stream=False,
            )

            choice = response.choices[0]
            message = choice.message

            # 如果有 tool_calls，执行工具
            if message.tool_calls:
                # 将 assistant message（含 tool_calls）加入对话
                full_messages.append({
                    "role": "assistant",
                    "content": message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ],
                })

                for tool_call in message.tool_calls:
                    tool_name = tool_call.function.name
                    try:
                        tool_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        tool_args = {}

                    yield {"type": "tool_call", "tool": tool_name, "args": tool_args}

                    # 执行工具
                    tool_result = await execute_tool(tool_name, tool_args, user_id, db)

                    yield {"type": "tool_result", "tool": tool_name, "result": tool_result[:200]}

                    # 将工具结果加入对话
                    full_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_result,
                    })

                # 继续循环让 LLM 处理工具结果
                continue

            # 没有 tool_calls，流式输出最终回答
            stream = await client.chat.completions.create(
                model=self.llm_config.model,
                messages=full_messages,
                temperature=self.llm_config.temperature,
                max_tokens=self.llm_config.max_tokens,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield {"type": "content", "content": content}

            break

        yield {"type": "done", "full_response": full_response}
