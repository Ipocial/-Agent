"""数据库配置 - SQLite + SQLAlchemy"""
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

# 使用绝对路径确保数据库文件可正确读写
_DB_DIR = Path(__file__).resolve().parent
_DB_PATH = _DB_DIR / "data.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{_DB_PATH}")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """获取数据库 session（FastAPI Depends 用）"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """初始化数据库表"""
    async with engine.begin() as conn:
        from models.db_models import User, Portfolio, ChatMessage  # noqa
        await conn.run_sync(Base.metadata.create_all)
