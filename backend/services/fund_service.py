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

    async def get_fund_ranking(self, ft: str = "all", sc: str = "zzf", pn: int = 50) -> list:
        """获取基金排行榜（东方财富 rankhandler.aspx）
        ft: all/gp(股票)/hh(混合)/zq(债券)/qdii
        sc: zzf(近1年)/zzf3n(近3年)/zzf6m(近6月)/zzf1m(近1月)/zdf(日涨幅)
        """
        import time as _time
        url = "https://fund.eastmoney.com/data/rankhandler.aspx"
        params = {
            "op": "ph",
            "dt": "kf",
            "ft": ft,
            "rs": "",
            "gs": "0",
            "sc": sc,
            "st": "desc",
            "pi": "1",
            "pn": str(pn),
            "dx": "1",
            "v": str(_time.time()),
        }
        headers = {
            **self.headers,
            "Referer": "http://fund.eastmoney.com/data/fundranking.html",
            "Accept": "*/*",
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=headers, timeout=20)
                text = resp.text
                # Response: var rankData = {datas:["code,name,...", ...],allRecords:N,...}
                data_match = re.search(r'datas:\[(.+?)\],', text, re.DOTALL)
                if not data_match:
                    return []
                datas_str = data_match.group(1)
                items = re.findall(r'"([^"]+)"', datas_str)
                result = []
                for idx, item in enumerate(items):
                    if not item:
                        continue
                    fields = item.split(",")
                    # 字段: [0]code [1]name [2]pinyin [3]date [4]nav [5]acc_nav
                    #       [6]daily [7]1w [8]1m [9]3m [10]6m [11]1y [12]2y [13]3y [14]ytd
                    if len(fields) < 12:
                        continue
                    try:
                        result.append({
                            "rank": idx + 1,
                            "code": fields[0],
                            "name": fields[1],
                            "nav": fields[4] if len(fields) > 4 and fields[4] else "0",
                            "acc_nav": fields[5] if len(fields) > 5 and fields[5] else "0",
                            "daily_return": fields[6] if len(fields) > 6 and fields[6] else "0",
                            "return_1w": fields[7] if len(fields) > 7 and fields[7] else "--",
                            "return_1m": fields[8] if len(fields) > 8 and fields[8] else "--",
                            "return_3m": fields[9] if len(fields) > 9 and fields[9] else "--",
                            "return_6m": fields[10] if len(fields) > 10 and fields[10] else "--",
                            "return_1y": fields[11] if len(fields) > 11 and fields[11] else "--",
                            "return_3y": fields[13] if len(fields) > 13 and fields[13] else "--",
                            "return_ytd": fields[14] if len(fields) > 14 and fields[14] else "--",
                        })
                    except (IndexError, ValueError):
                        continue
                return result
            except Exception as e:
                print(f"获取排行榜失败: {e}")
                return []

    async def get_funds_compare(self, codes: list) -> list:
        """并发获取多只基金对比数据，计算收益率和风险指标"""
        import asyncio

        async def get_one(code: str) -> dict:
            try:
                info = await self.get_fund_info(code)
                nav_history = await self.get_fund_nav_history(code, days=365)

                if len(nav_history) < 5:
                    return {"code": code, "name": info.name, "nav_history": [], "metrics": {}}

                daily_returns = [n.daily_return for n in nav_history if n.daily_return != 0]

                if len(daily_returns) < 2:
                    volatility = max_drawdown = sharpe = 0.0
                else:
                    mean_r = sum(daily_returns) / len(daily_returns)
                    variance = sum((r - mean_r) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
                    volatility = (variance ** 0.5) * (252 ** 0.5) * 100

                    # 最大回撤
                    navs = [n.acc_nav for n in nav_history]
                    peak = navs[0]
                    max_dd = 0.0
                    for nav in navs:
                        if nav > peak:
                            peak = nav
                        dd = (peak - nav) / peak if peak > 0 else 0
                        max_dd = max(max_dd, dd)
                    max_drawdown = max_dd * 100

                    # 夏普比率（无风险利率 2.5%/年）
                    risk_free_daily = 0.025 / 252
                    excess = [r - risk_free_daily for r in daily_returns]
                    mean_exc = sum(excess) / len(excess)
                    std_exc = (sum((r - mean_exc) ** 2 for r in excess) / (len(excess) - 1)) ** 0.5
                    sharpe = (mean_exc / std_exc * (252 ** 0.5)) if std_exc > 0 else 0.0

                def calc_return(days: int) -> str:
                    if len(nav_history) < days:
                        return "--"
                    start = nav_history[-days].acc_nav
                    end = nav_history[-1].acc_nav
                    if start <= 0:
                        return "--"
                    return f"{(end - start) / start * 100:.2f}"

                return {
                    "code": code,
                    "name": info.name,
                    "manager": info.manager or "",
                    "nav_history": [
                        {"date": n.date, "nav": n.nav, "acc_nav": n.acc_nav}
                        for n in nav_history[-90:]
                    ],
                    "metrics": {
                        "volatility": round(volatility, 2),
                        "max_drawdown": round(max_drawdown, 2),
                        "sharpe": round(sharpe, 2),
                        "return_1m": calc_return(22),
                        "return_3m": calc_return(63),
                        "return_6m": calc_return(126),
                        "return_1y": calc_return(244),
                    },
                }
            except Exception as e:
                print(f"对比数据获取失败 {code}: {e}")
                return {"code": code, "name": "", "nav_history": [], "metrics": {}}

        tasks = [get_one(c) for c in codes[:3]]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r for r in results if isinstance(r, dict)]

    async def get_market_indices(self) -> list:
        """获取三大指数实时行情（上证/深成/创业板）"""
        url = "https://push2.eastmoney.com/api/qt/ulist.np/get"
        params = {
            "fltt": "2",
            "invt": "2",
            "fields": "f2,f3,f4,f14",
            "secids": "1.000001,0.399001,0.399006",
        }
        index_codes = {
            "000001": "上证指数",
            "399001": "深证成指",
            "399006": "创业板指",
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers, timeout=10)
                data = resp.json()
                items = data.get("data", {}).get("diff", {})
                result = []
                # diff may be dict keyed by index or list
                if isinstance(items, dict):
                    items = list(items.values())
                for item in items:
                    name = item.get("f14", "")
                    price = item.get("f2", 0)
                    change_pct = item.get("f3", 0)
                    change_val = item.get("f4", 0)
                    # Guess code from name
                    code = ""
                    for k, v in index_codes.items():
                        if v == name:
                            code = k
                            break
                    result.append({
                        "name": name,
                        "code": code,
                        "price": price,
                        "change_pct": change_pct,
                        "change_val": change_val,
                    })
                return result
            except Exception as e:
                print(f"获取大盘指数失败: {e}")
                return []

    async def get_technical_signals(self, fund_code: str) -> dict:
        """计算基金技术指标信号（MA5/MA20/MA60、RSI14、金叉死叉）"""
        nav_history = await self.get_fund_nav_history(fund_code, days=120)

        if len(nav_history) < 21:
            return {
                "ma5": None, "ma20": None, "ma60": None, "rsi": None,
                "signal": "neutral", "signal_desc": "历史数据不足，无法计算技术指标",
                "nav_history": [],
            }

        navs = [n.nav for n in nav_history]
        n = len(navs)

        def ma(period: int, offset: int = 0) -> float:
            """计算从末尾往前 offset 处开始的 period 日均值"""
            end = n - offset
            start = end - period
            if start < 0:
                return 0.0
            return sum(navs[start:end]) / period

        ma5_now = ma(5, 0)
        ma20_now = ma(20, 0)
        ma60_now = ma(60, 0) if n >= 60 else None
        ma5_prev = ma(5, 3)   # 3日前的 MA5
        ma20_prev = ma(20, 3) # 3日前的 MA20

        # RSI(14)
        daily_returns = [n.daily_return for n in nav_history]
        rsi_returns = [r for r in daily_returns[-15:] if r != 0]
        if len(rsi_returns) >= 2:
            gains = [r for r in rsi_returns if r > 0]
            losses = [-r for r in rsi_returns if r < 0]
            avg_gain = sum(gains) / 14 if gains else 0
            avg_loss = sum(losses) / 14 if losses else 0
            if avg_loss == 0:
                rsi = 100.0
            else:
                rs = avg_gain / avg_loss
                rsi = round(100 - 100 / (1 + rs), 2)
        else:
            rsi = None

        # 判断金叉/死叉
        signal = "neutral"
        signal_desc = "均线趋势平稳，暂无明显买卖信号"
        if ma5_now and ma20_now and ma5_prev and ma20_prev:
            golden = ma5_now > ma20_now and ma5_prev <= ma20_prev
            death = ma5_now < ma20_now and ma5_prev >= ma20_prev
            if golden:
                signal = "bullish"
                signal_desc = "近期出现金叉：MA5 上穿 MA20，短期动能转强，可关注买入机会"
            elif death:
                signal = "bearish"
                signal_desc = "近期出现死叉：MA5 下穿 MA20，短期动能减弱，建议谨慎观望"
            elif ma5_now > ma20_now:
                signal = "bullish"
                signal_desc = "MA5 持续在 MA20 之上，短期趋势向上"
            elif ma5_now < ma20_now:
                signal = "bearish"
                signal_desc = "MA5 持续在 MA20 之下，短期趋势偏弱"

        # RSI 覆盖信号
        if rsi is not None:
            if rsi > 70:
                signal_desc += f"；RSI({rsi:.1f}) 超买区间，短期注意回调风险"
            elif rsi < 30:
                signal_desc += f"；RSI({rsi:.1f}) 超卖区间，可能存在反弹机会"

        return {
            "ma5": round(ma5_now, 4) if ma5_now else None,
            "ma20": round(ma20_now, 4) if ma20_now else None,
            "ma60": round(ma60_now, 4) if ma60_now else None,
            "rsi": rsi,
            "signal": signal,
            "signal_desc": signal_desc,
            "nav_history": [{"date": n.date, "nav": n.nav} for n in nav_history[-60:]],
        }


fund_service = FundService()
