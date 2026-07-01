"""基金数据采集服务 - 东方财富/天天基金公开接口"""
import re
import json
import httpx
from typing import List, Optional

from models.schemas import FundInfo, FundNAV, FundFullData


class FundService:
    """基金数据采集服务"""

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": "http://fund.eastmoney.com/",
        }

    async def search_funds(self, keyword: str) -> List[FundInfo]:
        """搜索基金（按代码或名称）"""
        url = "https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx"
        params = {
            "callback": "jQuery",
            "m": "1",
            "key": keyword,
            "pageindex": "1",
            "pagesize": "20",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=self.headers, timeout=10)
            text = resp.text
            # 解析JSONP响应
            json_str = re.search(r'jQuery\((.*)\)', text)
            if not json_str:
                return []
            data = json.loads(json_str.group(1))
            funds = []
            if data.get("Datas"):
                for item in data["Datas"]:
                    funds.append(FundInfo(
                        code=item.get("CODE", ""),
                        name=item.get("NAME", ""),
                        type=item.get("FundBaseInfo", {}).get("FTYPE", "") if isinstance(item.get("FundBaseInfo"), dict) else "",
                    ))
            return funds

    async def get_fund_info(self, fund_code: str) -> FundInfo:
        """获取基金基本信息"""
        url = f"https://fundgz.1702.com/js/{fund_code}.js"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, headers=self.headers, timeout=10)
                text = resp.text
                json_str = re.search(r'jsonpgz\((.*?)\)', text)
                if json_str:
                    data = json.loads(json_str.group(1))
                    return FundInfo(
                        code=data.get("fundcode", fund_code),
                        name=data.get("name", ""),
                        type="",
                    )
            except Exception:
                pass

        # 备用：从基金详情页获取信息
        detail_url = f"https://fund.eastmoney.com/pingzhongdata/{fund_code}.js"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(detail_url, headers=self.headers, timeout=10)
                text = resp.text
                name_match = re.search(r'fS_name\s*=\s*"([^"]*)"', text)
                code_match = re.search(r'fS_code\s*=\s*"([^"]*)"', text)
                manager_match = re.search(r'Data_currentFundManager\s*=\s*\[(.*?)\]', text, re.DOTALL)

                name = name_match.group(1) if name_match else ""
                code = code_match.group(1) if code_match else fund_code
                manager = ""
                if manager_match:
                    mgr_data = re.search(r'"name":"([^"]*)"', manager_match.group(1))
                    manager = mgr_data.group(1) if mgr_data else ""

                return FundInfo(code=code, name=name, manager=manager)
            except Exception:
                return FundInfo(code=fund_code, name="")

    async def get_fund_nav_history(self, fund_code: str, days: int = 90) -> List[FundNAV]:
        """获取基金历史净值数据"""
        url = "https://api.fund.eastmoney.com/f10/lsjz"
        params = {
            "callback": "jQuery",
            "fundCode": fund_code,
            "pageIndex": "1",
            "pageSize": str(days),
        }
        headers = {
            **self.headers,
            "Referer": f"https://fundf10.eastmoney.com/jjjz_{fund_code}.html",
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=headers, timeout=15)
                text = resp.text
                json_str = re.search(r'jQuery\((.*)\)', text)
                if not json_str:
                    return []
                data = json.loads(json_str.group(1))
                nav_list = []
                items = data.get("Data", {}).get("LSJZList", [])
                prev_nav = None
                for item in reversed(items):  # 按时间正序
                    nav = float(item.get("DWJZ", 0))
                    acc_nav = float(item.get("LJJZ", 0))
                    daily_return = 0.0
                    if prev_nav and prev_nav > 0:
                        daily_return = (nav - prev_nav) / prev_nav
                    nav_list.append(FundNAV(
                        date=item.get("FSRQ", ""),
                        nav=nav,
                        acc_nav=acc_nav,
                        daily_return=daily_return,
                    ))
                    prev_nav = nav
                return nav_list
            except Exception as e:
                print(f"获取基金净值历史失败: {e}")
                return []

    async def get_fund_realtime_estimate(self, fund_code: str) -> Optional[dict]:
        """获取基金实时估值"""
        url = f"https://fundgz.1702.com/js/{fund_code}.js"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, headers=self.headers, timeout=10)
                text = resp.text
                json_str = re.search(r'jsonpgz\((.*?)\)', text)
                if json_str:
                    data = json.loads(json_str.group(1))
                    return {
                        "code": data.get("fundcode", ""),
                        "name": data.get("name", ""),
                        "estimate_nav": float(data.get("gsz", 0)),
                        "estimate_return": data.get("gszzl", "0"),
                        "estimate_time": data.get("gztime", ""),
                    }
            except Exception:
                pass
        return None

    async def get_fund_full_data(self, fund_code: str) -> FundFullData:
        """获取基金完整数据（信息+净值历史）"""
        info = await self.get_fund_info(fund_code)
        nav_history = await self.get_fund_nav_history(fund_code, days=90)
        return FundFullData(info=info, nav_history=nav_history)


fund_service = FundService()
