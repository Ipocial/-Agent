"""工具函数"""
import re
import json
from typing import Any


def extract_json_from_text(text: str) -> dict:
    """从LLM返回的文本中提取JSON"""
    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 尝试从markdown代码块中提取
    json_match = re.search(r'```(?:json)?\s*\n(.*?)\n```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # 尝试从文本中找到第一个 { 到最后一个 }
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    return {}


def format_nav_data_for_prompt(nav_history: list, recent_days: int = 30) -> str:
    """将净值数据格式化为Prompt友好的文本"""
    recent = nav_history[:recent_days] if len(nav_history) > recent_days else nav_history
    lines = []
    for item in recent:
        lines.append(f"{item.date}: 净值{item.nav:.4f}, 日收益率{item.daily_return:.2%}")
    return "\n".join(lines)
