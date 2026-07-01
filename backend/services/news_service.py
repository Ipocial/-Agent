"""新闻/热点数据采集服务 - 东方财富财经新闻接口"""
import re
import json
import httpx
from typing import List

from models.schemas import NewsItem


class NewsService:
    """财经新闻采集服务"""

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": "https://www.eastmoney.com/",
        }

    async def get_financial_news(self, limit: int = 20) -> List[NewsItem]:
        """获取最新财经新闻（东方财富）"""
        url = "https://np-listapi.eastmoney.com/comm/web/getNewsByColumns"
        params = {
            "client": "web",
            "biz": "web_news_col",
            "column": "350",  # 财经要闻
            "order": "1",
            "needInteractData": "0",
            "page_index": "1",
            "page_size": str(limit),
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers, timeout=10)
                data = resp.json()
                news_list = []
                items = data.get("data", {}).get("list", [])
                for item in items:
                    news_list.append(NewsItem(
                        title=item.get("title", ""),
                        summary=item.get("digest", ""),
                        source=item.get("source", "东方财富"),
                        publish_time=item.get("showTime", ""),
                        url=item.get("url", ""),
                    ))
                return news_list
            except Exception as e:
                print(f"获取财经新闻失败: {e}")
                # 备用：尝试新浪财经
                return await self._get_sina_news(limit)

    async def _get_sina_news(self, limit: int = 20) -> List[NewsItem]:
        """备用：新浪财经新闻"""
        url = "https://feed.mix.sina.com.cn/api/roll/get"
        params = {
            "pageid": "153",
            "lid": "2516",
            "k": "",
            "num": str(limit),
            "page": "1",
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers, timeout=10)
                data = resp.json()
                news_list = []
                items = data.get("result", {}).get("data", [])
                for item in items:
                    news_list.append(NewsItem(
                        title=item.get("title", ""),
                        summary=item.get("intro", ""),
                        source="新浪财经",
                        publish_time=item.get("ctime", ""),
                        url=item.get("url", ""),
                    ))
                return news_list
            except Exception as e:
                print(f"获取新浪财经新闻也失败: {e}")
                return []

    async def get_hot_topics(self) -> List[dict]:
        """获取热点话题/板块"""
        url = "https://push2.eastmoney.com/api/qt/clist/get"
        params = {
            "cb": "jQuery",
            "fid": "f3",
            "po": "1",
            "pz": "20",
            "pn": "1",
            "np": "1",
            "fs": "m:90+t:2",  # 板块行情
            "fields": "f2,f3,f4,f12,f14",
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers, timeout=10)
                text = resp.text
                json_str = re.search(r'jQuery\((.*)\)', text)
                if not json_str:
                    return []
                data = json.loads(json_str.group(1))
                topics = []
                items = data.get("data", {}).get("diff", [])
                for item in items:
                    topics.append({
                        "name": item.get("f14", ""),
                        "code": item.get("f12", ""),
                        "change_pct": item.get("f3", 0),
                        "price": item.get("f2", 0),
                    })
                return topics
            except Exception as e:
                print(f"获取热点话题失败: {e}")
                return []

    async def get_market_sentiment(self) -> dict:
        """获取市场情绪指标（涨跌家数等）"""
        url = "https://push2.eastmoney.com/api/qt/clist/get"
        params = {
            "cb": "jQuery",
            "fid": "f3",
            "po": "1",
            "pz": "5000",
            "pn": "1",
            "np": "1",
            "fs": "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23",  # A股全部
            "fields": "f3",
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers, timeout=15)
                text = resp.text
                json_str = re.search(r'jQuery\((.*)\)', text)
                if not json_str:
                    return {"sentiment": "未知", "up_count": 0, "down_count": 0}
                data = json.loads(json_str.group(1))
                items = data.get("data", {}).get("diff", [])
                up_count = sum(1 for item in items if item.get("f3", 0) > 0)
                down_count = sum(1 for item in items if item.get("f3", 0) < 0)
                total = len(items)

                if total == 0:
                    sentiment = "未知"
                elif up_count / total > 0.6:
                    sentiment = "贪婪"
                elif up_count / total > 0.45:
                    sentiment = "偏乐观"
                elif down_count / total > 0.6:
                    sentiment = "恐慌"
                elif down_count / total > 0.45:
                    sentiment = "偏悲观"
                else:
                    sentiment = "中性"

                return {
                    "sentiment": sentiment,
                    "up_count": up_count,
                    "down_count": down_count,
                    "flat_count": total - up_count - down_count,
                    "total": total,
                }
            except Exception as e:
                print(f"获取市场情绪失败: {e}")
                return {"sentiment": "未知", "up_count": 0, "down_count": 0}


news_service = NewsService()
