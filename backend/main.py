"""FastAPI 应用入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import fund, analysis, news

app = FastAPI(
    title="基金购买建议 Multi-Agent 系统",
    description="基于多Agent协作的基金投资分析与建议系统",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(fund.router, prefix="/api/funds", tags=["基金数据"])
app.include_router(news.router, prefix="/api/news", tags=["财经新闻"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["分析建议"])


@app.get("/")
async def root():
    return {"message": "基金购买建议 Multi-Agent 系统", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
