"""多模型LLM统一客户端"""
import json
from typing import List, Dict, Optional, AsyncGenerator

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

from config import settings, LLMConfig


class LLMClient:
    """统一的多模型LLM客户端"""

    def __init__(self):
        self._openai_client: Optional[AsyncOpenAI] = None
        self._anthropic_client: Optional[AsyncAnthropic] = None

    @property
    def openai_client(self) -> AsyncOpenAI:
        if self._openai_client is None:
            self._openai_client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL,
            )
        return self._openai_client

    @property
    def anthropic_client(self) -> AsyncAnthropic:
        if self._anthropic_client is None:
            self._anthropic_client = AsyncAnthropic(
                api_key=settings.ANTHROPIC_API_KEY,
            )
        return self._anthropic_client

    async def chat(
        self,
        messages: List[Dict[str, str]],
        config: LLMConfig,
        response_format: Optional[str] = "json",
    ) -> str:
        """统一对话接口，返回LLM回复文本"""
        if config.provider == "openai":
            return await self._chat_openai(messages, config, response_format)
        elif config.provider == "anthropic":
            return await self._chat_anthropic(messages, config)
        elif config.provider == "dashscope":
            return await self._chat_dashscope(messages, config, response_format)
        else:
            raise ValueError(f"不支持的LLM提供商: {config.provider}")

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        config: LLMConfig,
    ) -> AsyncGenerator[str, None]:
        """流式对话接口"""
        if config.provider == "openai":
            async for chunk in self._stream_openai(messages, config):
                yield chunk
        elif config.provider == "anthropic":
            async for chunk in self._stream_anthropic(messages, config):
                yield chunk
        elif config.provider == "dashscope":
            async for chunk in self._stream_dashscope(messages, config):
                yield chunk

    async def _chat_openai(
        self, messages: List[Dict], config: LLMConfig, response_format: Optional[str]
    ) -> str:
        """OpenAI对话"""
        kwargs = {
            "model": config.model,
            "messages": messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
        }
        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.openai_client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    async def _chat_anthropic(self, messages: List[Dict], config: LLMConfig) -> str:
        """Anthropic Claude对话"""
        # 分离system message
        system_msg = ""
        chat_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            else:
                chat_messages.append(msg)

        response = await self.anthropic_client.messages.create(
            model=config.model,
            max_tokens=config.max_tokens,
            system=system_msg,
            messages=chat_messages,
            temperature=config.temperature,
        )
        return response.content[0].text

    async def _chat_dashscope(
        self, messages: List[Dict], config: LLMConfig, response_format: Optional[str]
    ) -> str:
        """阿里通义千问对话（通过OpenAI兼容接口）"""
        client = AsyncOpenAI(
            api_key=settings.DASHSCOPE_API_KEY,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        kwargs = {
            "model": config.model,
            "messages": messages,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
        }
        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}

        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    async def _stream_openai(self, messages: List[Dict], config: LLMConfig) -> AsyncGenerator[str, None]:
        """OpenAI流式输出"""
        stream = await self.openai_client.chat.completions.create(
            model=config.model,
            messages=messages,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def _stream_anthropic(self, messages: List[Dict], config: LLMConfig) -> AsyncGenerator[str, None]:
        """Anthropic流式输出"""
        system_msg = ""
        chat_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            else:
                chat_messages.append(msg)

        async with self.anthropic_client.messages.stream(
            model=config.model,
            max_tokens=config.max_tokens,
            system=system_msg,
            messages=chat_messages,
            temperature=config.temperature,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def _stream_dashscope(self, messages: List[Dict], config: LLMConfig) -> AsyncGenerator[str, None]:
        """通义千问流式输出"""
        client = AsyncOpenAI(
            api_key=settings.DASHSCOPE_API_KEY,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        stream = await client.chat.completions.create(
            model=config.model,
            messages=messages,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


llm_client = LLMClient()
